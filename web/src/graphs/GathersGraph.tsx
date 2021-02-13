import {Button, Container, Dimmer, Form, Grid, Search} from "semantic-ui-react";
import Modal from "semantic-ui-react/dist/commonjs/modules/Modal";
import * as React from "react";
import {useEffect, useRef, useState} from "react";
import ReactDOM from "react-dom";
import {Game, GatherStatsPoint, RatingUpdate, Round, UserResponse, WeaponStatsPoint} from "../util/api";
import * as d3 from "d3";
import {D3BrushEvent} from "d3";
import {RatingCard} from "./RatingCard";
import "./RatingModal.css";
import moment, {Moment} from "moment";
import Loader from "semantic-ui-react/dist/commonjs/elements/Loader";
import _ from "lodash"
import * as jStat from "jstat";
import {getNormalColorScale, GLOBAL_MU, GLOBAL_SIGMA, normal, NormalPoint} from "../util/normalCurve";
import {UserCache} from "../App";
import {RoundPopupContents} from "./GamePopup";
import Input from "semantic-ui-react/dist/commonjs/elements/Input";
import {BaseType} from "d3-selection";


interface Props {
    gatherStats: GatherStatsPoint[]
}


export const GathersGraph = ({gatherStats}: Props) => {

    const figureWidth = 1000
    const figureHeight = 450

    const d3Container = useRef(null)

    const [numDatesToDisplay, setNumDatesToDisplay] = useState(1000)
    const [numDatesToDisplayString, setNumDatesToDisplayString] = useState("1000")

    useEffect(() => {
        if (gatherStats.length === 0) {
            return
        }

        const legendWidth = 100;

        // set the dimensions and margins of the graph
        const margin = {top: 50, right: 30, bottom: 30, left: 50}
        const width = figureWidth - margin.left - margin.right - legendWidth;
        const height = figureHeight - margin.top - margin.bottom;
        const bars: d3.Selection<SVGRectElement, Game, null, undefined>[] = []
        const sizeColor = d3.scaleOrdinal([...d3.schemeCategory10]);

        // append the svg object to the body of the page
        let svg = d3.select(d3Container.current)
        svg.selectAll("*").remove()

        let graph = svg
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        const data = gatherStats

        // Find the number of rounds to display based on numLastGames
        let dataToDisplay = _.takeRight(data, numDatesToDisplay)

        const getXScale = (data: GatherStatsPoint[]) => {
            return d3.scaleBand()
                .domain(dataToDisplay.map(item => item.date))
                .range([0, width])
        }

        const getYScale = (data: GatherStatsPoint[]) => {
            const maxGames = _.max(dataToDisplay.map(item => item.total))

            return d3.scaleLinear()
                .domain([0, maxGames!])
                .range([height, 0])
                .nice()
        }

        const filterData = (data: GatherStatsPoint[], minX: Date, maxX: Date) => {
            return _.filter(data, d => {
                const date = moment(d.date).toDate()
                return date >= minX && date <= maxX
            })
        }
        //
        // const getLine = (weaponName: string) => {
        //     return d3.line<WeaponStatsPoint>()
        //         .x(d => x(getXValue(d)))
        //         .y(d => y(d.weapons[weaponName].kills))
        //         .curve(curveType)
        // }

        let x = getXScale(dataToDisplay)
        let y = getYScale(dataToDisplay)

        const xAxis = graph.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x));

        xAxis.selectAll("text")
            .attr("y", 0)
            .attr("x", 9)
            .attr("dy", ".35em")
            .attr("transform", "rotate(90)")
            .attr("text-anchor", "start")

        const yAxis = graph.append("g")
            .call(d3.axisLeft(y));

        // Add a rectangular clipPath: everything out of this area won't be drawn. This ensures that as we zoom into
        // our graph we won't see any lines being drawn outside of the axis area
        const defs = graph.append("defs")
        defs
            .append("svg:clipPath")
            .attr("id", "clip")
            .append("svg:rect")
            .attr("width", width)
            .attr("height", height)
            .attr("x", 0)
            .attr("y", 0)

        const legend = graph.append('g')

        // Create a group where both the line and the brush are drawn, link it to the earlier clip path
        const group = graph.append('g')
            .attr("clip-path", "url(#clip)")

        // Add a brush for selecting an area to zoom into
        const brush = d3.brushX()
            // Cover the full extent of the graph
            .extent([[0, 0], [width, height]])
            // Each time the brush selection changes, trigger the 'updateChart' function
            .on("end", updateChart)

        // Generate the brush (drawn in the same group which contains the line, using the clip area)
        group.append("g")
            .attr("class", "brush")
            .call(brush);

        const gameBarHeight = 50;

        console.log(dataToDisplay)
        console.log(y(0))
        console.log(y(1))
        console.log(y(2))

        _.forEach(dataToDisplay, item => {
            _.forEach(_.sortBy(item.games, game => game.size), (game, i) => {
                // Add the line to the above group
                const gameBar = group.append("rect")
                    .datum(game)
                    .attr("fill", sizeColor(`${game.size}`))
                    .attr("x", x(item.date)!)
                    .attr("y", y(i) - gameBarHeight)
                    .attr("height", gameBarHeight)
                    .attr("width", x.bandwidth())

                gameBar.on("mouseover", (e: d3.ClientPointEvent, d: Game) => {
                    // TODO: Display game details
                    // const [clientX, clientY] = d3.pointer(e)
                    //
                    // const xPoint = x.invert(clientX)
                    // const yPoint = y.invert(clientY)
                    //
                    // let index;
                    //
                    // if (xPoint instanceof Date) {
                    //     index = d3.bisect(dataToDisplay.map(d => d.startTime), xPoint.valueOf())
                    // } else {
                    //     index = d3.bisect(dataToDisplay.map(d => d.roundNumber), xPoint)
                    // }
                    //
                    // const datum = dataToDisplay[index]
                    //
                    // gameBar.attr("stroke-width", lineWidthHover)
                    // const tooltipGroup = graph
                    //     .append("g")
                    //     .attr("id", `${cleanWeaponName}Tooltip`)
                    //
                    // const tooltipText = tooltipGroup.append("text")
                    //     .attr("id", `${cleanWeaponName}TooltipText`)
                    //     .datum(weaponName)
                    //     .attr("x", clientX + 10)
                    //     .attr("y", clientY - 10) // 100 is where the first dot appears. 25 is the distance between dots
                    //     .style("fill", sizeColor(weaponName))
                    //     .text(`${weaponName}: ${datum.weapons[weaponName].kills}`)
                    //     .attr("text-anchor", "left")
                    //     .style("alignment-baseline", "middle")
                    //     .style("font-size", "14px")
                    //
                    // const tooltipPadding = 3
                    //
                    // tooltipGroup.insert("rect", `#${cleanWeaponName}TooltipText`)
                    //     .style("fill", "rgb(0, 0, 0, 0.7)")
                    //     .attr("x", clientX + 10 - tooltipPadding)
                    //     .attr("y", clientY - 10 - tooltipText.node()!.getBBox().height)
                    //     .attr("width", tooltipText.node()!.getBBox().width + tooltipPadding * 2)
                    //     .attr("height", tooltipText.node()!.getBBox().height + tooltipPadding * 2)
                })

                gameBar.on("mouseout", (e: d3.ClientPointEvent, d: Game) => {
                    // gameBar.attr("stroke-width", lineWidth)
                    // graph.select(`#${cleanWeaponName}Tooltip`).remove()
                })

                // TODO: Add legend for sizes
                //
                // legend
                //     .append("circle")
                //     .datum(weaponName)
                //     .attr("cx", width + 20)
                //     .attr("cy", d => i * 20) // 100 is where the first dot appears. 25 is the distance between dots
                //     .attr("r", 6)
                //     .style("fill", d => sizeColor(d))
                //
                // legend
                //     .append("text")
                //     .datum(weaponName)
                //     .attr("x", width + 40)
                //     .attr("y", d => i * 20) // 100 is where the first dot appears. 25 is the distance between dots
                //     .style("fill", d => sizeColor(d))
                //     .text(d => d)
                //     .attr("text-anchor", "left")
                //     .style("alignment-baseline", "middle")
                //     .style("font-size", "14px")

                bars.push(gameBar)
            })
        })

        const transitionGraph = (data: GatherStatsPoint[]) => {
            // Transition to new axis using the new domains
            yAxis.transition()
                .duration(1000)
                .call(d3.axisLeft(y));

            xAxis.transition()
                .duration(1000)
                .call(d3.axisBottom(x))

            // TODO: Potentially transition bars?
            // bars.forEach(bar => {
            //     bar
            //         .transition()
            //         .duration(1000)
            //         .attr("d", getLine(weaponName))
            // })
        }

        function updateChart(event: D3BrushEvent<unknown>, d: unknown) {
            // This is the area that has been selected
            // const extent = event.selection as [number, number]
            //
            // if (extent) {
            //     // If something was selected, filter the data to display
            //     const [minX, maxX] = [x.invert(extent[0]), x.invert(extent[1])]
            //
            //     dataToDisplay = filterData(data, minX, maxX)
            //
            //     x = getXScale(dataToDisplay)
            //     y = getYScale(dataToDisplay)
            //
            //     // This remove the grey brush area as soon as the selection has been done
            //     // group.select(".brush").call(brush.move, null)
            //     brush.move(group.select(".brush"), null)
            // }
            //
            // // Update axis and line position
            // transitionGraph(dataToDisplay)
        }

        // If user double click, reinitialize the chart by zooming out over the unfiltered data
        graph.on("dblclick", () => {
            dataToDisplay = [...data]

            x = getXScale(dataToDisplay)
            y = getYScale(dataToDisplay)
            transitionGraph(dataToDisplay)
        });

        transitionGraph(dataToDisplay)
    }, [gatherStats, numDatesToDisplay])

    return (
        gatherStats.length === 0 ?
            <Dimmer active inverted>
                <Loader inverted>Loading...</Loader>
            </Dimmer>
            : <div>
                <h3>Weapon Kills Over Time</h3>
                <Container>
                    <Form>
                        <p>Click & drag to zoom. Double-click to zoom out fully.</p>
                        <Form.Group inline>
                            <span> Last <Input
                                value={numDatesToDisplay}
                                style={{
                                    width: "70px",
                                }}
                                onChange={(e) => {
                                    setNumDatesToDisplayString(e.target.value)

                                    const newValue = parseInt(e.target.value)
                                    if (!isNaN(newValue)) {
                                        setNumDatesToDisplay(Math.max(1, newValue))
                                    }
                                }}
                            /> Rounds
                            </span>
                        </Form.Group>
                    </Form>
                </Container>
                <div className={"svg-container"}>
                    <svg
                        ref={d3Container}
                        preserveAspectRatio="xMinYMin meet"
                        viewBox={`0 0 ${figureWidth} ${figureHeight}`}
                        className={"svg-content-responsive"}
                    />
                </div>
            </div>
    )
}

