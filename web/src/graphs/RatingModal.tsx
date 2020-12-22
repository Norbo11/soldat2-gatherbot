import {Button, Dimmer, Grid} from "semantic-ui-react";
import Modal from "semantic-ui-react/dist/commonjs/modules/Modal";
import * as React from "react";
import {UserResponse} from "../util/api";
import {useEffect, useRef} from "react";
import * as d3 from "d3";
import {D3BrushEvent} from "d3";
import {RatingCard} from "./RatingCard";
import "./RatingModal.css";
import moment, {Moment} from "moment";
import Loader from "semantic-ui-react/dist/commonjs/elements/Loader";

interface Props {
    user?: UserResponse,
    onClose: () => void
}

interface RatingData {
    date: Moment,
    value: number
}

export const RatingModal = ({onClose, user}: Props) => {

    const figureWidth = 460
    const figureHeight = 400

    const d3Container = useRef(null)

    useEffect(() => {
        if (user === undefined) {
            return
        }

        // set the dimensions and margins of the graph
        const margin = {top: 10, right: 30, bottom: 30, left: 30}
        const width = figureWidth - margin.left - margin.right
        const height = figureHeight - margin.top - margin.bottom;

        // append the svg object to the body of the page
        let svg = d3.select(d3Container.current)
        svg.selectAll("*").remove()

        let graph = svg
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        console.log(user)

        const data = user.ratingUpdates.map(update => {
            return {
                date: moment(update.roundStartTime),
                value: update.newMu - 3 * update.newSigma
            } as RatingData
        })

        // Add X axis --> it is a date format
        const x = d3.scaleTime()
            .domain(d3.extent(data, d => d.date) as Moment[])
            .range([0, width]);

        // Add Y axis
        const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => +d.value)] as number[])
            .range([height, 0]);

        const xAxis = graph.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x));

        const yAxis = graph.append("g")
            .call(d3.axisLeft(y));

        // Add a clipPath: everything out of this area won't be drawn.
        const clip = graph.append("defs")
            .append("svg:clipPath")
                .attr("id", "clip")
            .append("svg:rect")
                .attr("width", width)
                .attr("height", height)
                .attr("x", 0)
                .attr("y", 0);

        // Add a brush for selecting an area to zoom into
        const brush = d3.brushX()
            // Cover the full extent of the graph
            .extent([[0, 0], [width, height]])
            // Each time the brush selection changes, trigger the 'updateChart' function
            .on("end", updateChart)

        // Create a group where both the line and the brush are drawn, link it to the earlier clip path
        const group = graph.append('g')
            .attr("clip-path", "url(#clip)")

        // Add the line
        const line = group.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 1.5)
            .attr("d", d3.line<RatingData>()
                .x(d => x(d.date))
                .y(d => y(d.value))
            )

        // Add the brushing
        group
            .append("g")
            .attr("class", "brush")
            .call(brush);

        // A function that set idleTimeOut to null
        let idleTimeout: any | null = null

        function idled() {
            idleTimeout = null;
        }

        // A function that update the chart for given boundaries
        function updateChart(event: D3BrushEvent<unknown>, d: unknown) {

            // This is the area that has been selected
            const extent = event.selection as [number, number]

            if (!extent) {
                // If no selection, reset back to the original domain
                if (!idleTimeout) return idleTimeout = setTimeout(idled, 350);
                x.domain([4, 8])
            } else {
                // If selection, set the domain to what was selected
                x.domain([x.invert(extent[0]), x.invert(extent[1])])

                // This remove the grey brush area as soon as the selection has been done
                // group.select(".brush").call(brush.move, null)
                brush.move(group.select(".brush"), null)

            }

            // Update axis and line position
            xAxis.transition().duration(1000).call(d3.axisBottom(x))
            line
                .transition()
                .duration(1000)
                .attr("d", d3.line<RatingData>()
                    .x(d => x(d.date))
                    .y(d => y(d.value))
                )
        }

        // If user double click, reinitialize the chart
        graph.on("dblclick", () => {
            x.domain(d3.extent(data, d => d.date) as [Moment, Moment])

            xAxis.transition()
                .call(d3.axisBottom(x))

            line
                .transition()
                .attr("d", d3.line<RatingData>()
                    .x(d => x(d.date))
                    .y(d => y(d.value))
                )
        });

    })

    return (
        <Modal
            dimmer={"inverted"}
            open={true}
            onClose={onClose}
        >
            <Modal.Header>{ user !== undefined ? `Stats for ${user.displayName}` : "Loading stats..."}</Modal.Header>
            <Modal.Content
                className={"rating-modal"}
            >
                {user !== undefined ?
                    <Grid columns={2}>
                        <Grid.Row>
                            <Grid.Column>
                                <RatingCard user={user} />
                            </Grid.Column>
                            <Grid.Column>
                                <div className={"svg-container"}>
                                    <svg
                                        ref={d3Container}
                                        preserveAspectRatio="xMinYMin meet"
                                        viewBox={`0 0 ${figureWidth} ${figureHeight}`}
                                        className={"svg-content-responsive"}
                                    />
                                </div>
                            </Grid.Column>
                        </Grid.Row>
                    </Grid>
                    :
                    <Dimmer active inverted>
                        <Loader inverted>Loading...</Loader>
                    </Dimmer>
                }
            </Modal.Content>
            <Modal.Actions>
                <Button negative onClick={onClose}>
                    Close
                </Button>
            </Modal.Actions>
        </Modal>
    )
}

