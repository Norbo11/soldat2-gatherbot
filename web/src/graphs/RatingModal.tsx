import {Button, Dimmer, Form, Grid} from "semantic-ui-react";
import Modal from "semantic-ui-react/dist/commonjs/modules/Modal";
import * as React from "react";
import {useEffect, useRef, useState} from "react";
import ReactDOM from "react-dom";
import {Game, RatingUpdate, Round, UserResponse} from "../util/api";
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


interface Props {
    user: UserResponse,
    onClose: () => void,
    userCache: UserCache,
    fetchNewUser: (discordId: string) => void
}

interface RatingData {
    date: Moment,
    lowerTrueSkillEstimate: number,
    roundNumber: number,
    update: RatingUpdate
}

export const RatingModal = ({onClose, user, userCache, fetchNewUser}: Props) => {

    const figureWidth = 700
    const figureHeight = 450

    const d3Container = useRef(null)

    const [xAxisType, setXAxisType] = useState("rounds")
    const [numLastGames, setNumLastGames] = useState(5)
    const [hoverRound, setHoverRound] = useState<Round | undefined>(undefined)

    useEffect(() => {
        // set the dimensions and margins of the graph
        const margin = {top: 50, right: 30, bottom: 30, left: 30}
        const width = figureWidth - margin.left - margin.right
        const height = figureHeight - margin.top - margin.bottom;
        const curveType = xAxisType === "rounds" ? d3.curveLinear : d3.curveStep

        // append the svg object to the body of the page
        let svg = d3.select(d3Container.current)
        svg.selectAll("*").remove()

        let graph = svg
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        const data = user.ratingUpdates.map((update, i) => {
            return {
                date: moment(update.roundStartTime),
                lowerTrueSkillEstimate: update.newMu - 3 * update.newSigma,
                roundNumber: user.ratingUpdates.length - i,
                update
            } as RatingData
        })

        // Initially the graph will display the last N games (multiplied by 3 assuming each game is 3 rounds)
        let dataToDisplay = _.take(data, numLastGames * 3)

        const getXScale = (data: RatingData[]) => {
            if (xAxisType === "time") {
                const [min, max] = d3.extent(data, d => d.date) as Moment[]

                return d3.scaleTime()
                    .domain([min, max])
                    .range([0, width])

            } else if (xAxisType === "rounds") {
                const [min, max] = d3.extent(data, d => d.roundNumber) as number[]

                return d3.scaleLinear()
                    .domain([min, max + 1])
                    .range([0, width])
            } else {
                throw Error(`Unexpected xAxisType: ${xAxisType}`)
            }
        }

        const getYScale = (data: RatingData[]) => {
            const [min, max] = d3.extent(data, d => d.lowerTrueSkillEstimate) as number[]

            return d3.scaleLinear()
                .domain([Math.max(0, min), max])
                .range([height, 0])
                .nice()
        }

        const getXValue = (d: RatingData) => {
            if (xAxisType === "time") {
                return d.date
            } else if (xAxisType === "rounds") {
                return d.roundNumber
            } else {
                throw Error(`Unexpected xAxisType: ${xAxisType}`)
            }
        }

        const filterData = (data: RatingData[], minX: number | Date, maxX: number | Date) => {
            if (xAxisType === "time") {
                return _.filter(data, d => d.date.toDate() >= minX && d.date.toDate() <= maxX)
            } else if (xAxisType === "rounds") {
                return _.filter(data, d => d.roundNumber >= minX && d.roundNumber <= maxX)
            } else {
                throw Error(`Unexpected xAxisType: ${xAxisType}`)
            }
        }

        const getLine = () => {
            return d3.line<RatingData>()
                .x(d => x(getXValue(d)))
                .y(d => y(d.lowerTrueSkillEstimate))
                .curve(curveType)
        }

        let x = getXScale(dataToDisplay)
        let y = getYScale(dataToDisplay)

        const xAxis = graph.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x));

        const yAxis = graph.append("g")
            .call(d3.axisLeft(y));


        const normalPoints: NormalPoint[] = normal(GLOBAL_MU, GLOBAL_SIGMA);
        const colorScale = getNormalColorScale()

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

        defs
            .append("linearGradient")
            .attr("id", "ratingGraphGradient")
            .attr("x1", "0%")
            .attr("y1", "100%")
            // .attr("y1", y(100))
            .attr("x2", "0%")
            .attr("y2", "0%")
            // .attr("y2", y(0))
            .selectAll("stop")
            .data(normalPoints.map(x => {
                const percentage = (jStat.normal.cdf(x.x, GLOBAL_MU, GLOBAL_SIGMA) * 100)
                return {
                    // offset: `${y(percentage)}`,
                    offset: `${percentage}%`,
                    // Uncomment this to see what a regular gardient would look like without our "gaussian" gradient
                    // offset: `${x.x}%`
                    color: colorScale(percentage)
                }
            }))
            .enter().append("stop")
            .attr("offset", d => d.offset)
            .attr("stop-color", d => d.color)

        // Create a group where both the line and the brush are drawn, link it to the earlier clip path
        const group = graph.append('g')
            .attr("clip-path", "url(#clip)")

        // Add the line to the above group
        const line = group.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", "black")
            .attr("stroke-width", 3.0)
            .attr("d", getLine())

        const getArea = () => {
            return d3.area<RatingData>()
                .x(d => x(getXValue(d)))
                .y0(d => y(0))
                .y1(d => y(d.lowerTrueSkillEstimate))
                .curve(curveType)
        }

        const area = group.append("path")
            .attr("id", "ratingGraphArea")
            .attr("fill", "url(#ratingGraphGradient)")
            .datum(data)
            .attr("class", "area")
            .attr("d", getArea())

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

        const transitionGraph = (data: RatingData[]) => {
            // Transition to new axis using the new domains
            yAxis.transition()
                .duration(1000)
                .call(d3.axisLeft(y));

            xAxis.transition()
                .duration(1000)
                .call(d3.axisBottom(x))

            // Transition to a new line. If the domain was 0-100 and then changed to 0-50, this essentially creates the
            // desired "zooming" effect by mapping a smaller domain over the same range (pixels on the screen).
            line
                .transition()
                .duration(1000)
                .attr("d", getLine())

            area
                .transition()
                .duration(1000)
                .attr("d", getArea())

            // Draw new points
            const circles = group.selectAll(".my-circle")
                .data(data)

            circles
                .exit()
                .transition()
                .duration(500)
                .style("opacity", "0")
                .remove()

            const radius = d3.scaleLinear()
                .domain([0, 200])
                .range([5, 0])
                .clamp(true)

            const r = radius(dataToDisplay.length)

            const handleMouseOverPoint = (e: d3.ClientPointEvent, d: RatingData) => {
                const roundBoxWidth = 400
                const roundBoxHeight = 200

                const game = user.sortedGames.find(game => game.startTime === d.update.gameStartTime)!
                const round = game.rounds.find(round => round.startTime === d.update.roundStartTime)!

                // Make sure tooltips do not leave the bounds of the figure
                const tooltipX = Math.max(0, Math.min(width - roundBoxWidth, x(getXValue(d)) - roundBoxWidth / 2))
                const tooltipY = Math.max(0, Math.min(height - roundBoxHeight, y(d.lowerTrueSkillEstimate) - roundBoxHeight / 2 + 5))

                // This is controlled by React.createPortal in the render method of this component
                group.insert("foreignObject", `#ratingCircle${d.roundNumber}`)
                    .attr("id", `roundHoverBox${round.startTime}`)
                    .attr("x", tooltipX)
                    .attr("y", tooltipY)
                    .attr("width", roundBoxWidth)
                    .attr("height", roundBoxHeight)

                setHoverRound(round)
            }

            const handleMouseOutPoint = (e: d3.ClientPointEvent, d: RatingData) => {
                d3.select(`#roundHoverBox${d.update.roundStartTime}`).remove();
                setHoverRound(undefined)
            }

            // Enter selection; new circles should fade in
            circles
                .enter()
                .append("circle")
                .attr("id", d => `ratingCircle${d.roundNumber}`)
                .attr("class", "my-circle")
                .style("opacity", "0")
                .attr("fill", d => colorScale(d.lowerTrueSkillEstimate))
                .attr("stroke", "black")
                .attr("cx", d => x(getXValue(d)))
                .attr("cy", d => y(d.lowerTrueSkillEstimate))
                .attr("r", d => r)
                .on("mouseover", handleMouseOverPoint)
                .on("mouseout", handleMouseOutPoint)
                .transition()
                .duration(1000)
                .style("opacity", "1")

            // Update selection; all existing circles should change position and radius
            circles
                .transition()
                .duration(1000)
                .attr("cx", d => x(getXValue(d)))
                .attr("cy", d => y(d.lowerTrueSkillEstimate))
                .attr("r", d => r)

        }

        function updateChart(event: D3BrushEvent<unknown>, d: unknown) {
            // This is the area that has been selected
            const extent = event.selection as [number, number]

            if (extent) {
                // If something was selected, filter the data to display
                const [minX, maxX] = [x.invert(extent[0]), x.invert(extent[1])]

                dataToDisplay = filterData(data, minX, maxX)

                x = getXScale(dataToDisplay)
                y = getYScale(dataToDisplay)

                // This remove the grey brush area as soon as the selection has been done
                // group.select(".brush").call(brush.move, null)
                brush.move(group.select(".brush"), null)
            }

            // Update axis and line position
            transitionGraph(dataToDisplay)
        }

        // If user double click, reinitialize the chart by zooming out over the unfiltered data
        graph.on("dblclick", () => {
            dataToDisplay = [...data]

            x = getXScale(dataToDisplay)
            y = getYScale(dataToDisplay)
            transitionGraph(dataToDisplay)
        });

        transitionGraph(dataToDisplay)
    }, [user, numLastGames, xAxisType])

    let portal = null;
    if (hoverRound !== undefined) {
        const hoverBoxElem = document.getElementById(`roundHoverBox${hoverRound.startTime}`)!

        portal = ReactDOM.createPortal(
            <RoundPopupContents
                round={hoverRound}
                userCache={userCache}
                fetchNewUser={fetchNewUser}
            />, hoverBoxElem
        )
    }

    return (
        <Modal
            dimmer={"inverted"}
            open={true}
            onClose={onClose}
            size="large"
            style={{
                width: "95%"
            }}
        >
            { portal }
            <Modal.Header>{user !== undefined ? `Stats for ${user.displayName}` : "Loading stats..."}</Modal.Header>
            <Modal.Content
                scrolling
                className={"rating-modal"}
            >
                {user !== undefined ?
                    <Grid columns={2}>
                        <Grid.Row>
                            <Grid.Column>
                                <RatingCard
                                    interactive
                                    numLastGames={numLastGames}
                                    setNumLastGames={setNumLastGames}
                                    user={user}
                                    userCache={userCache}
                                    fetchNewUser={fetchNewUser}
                                />
                            </Grid.Column>
                            <Grid.Column>
                                <h3>Lower TrueSkill Estimate Graph</h3>
                                <Form>
                                    <p>Click & drag to zoom. Double-click to zoom out fully.</p>
                                    <Form.Group inline>
                                        <label>X-Axis</label>
                                        <Form.Radio
                                            inline
                                            label={"Time"}
                                            value={"time"}
                                            checked={xAxisType === "time"}
                                            onChange={(e, {value}) => setXAxisType(value as string)}
                                        />
                                        <Form.Radio
                                            inline
                                            label={"Round Number"}
                                            value={"rounds"}
                                            checked={xAxisType === "rounds"}
                                            onChange={(e, {value}) => setXAxisType(value as string)}
                                        />
                                    </Form.Group>
                                </Form>
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

