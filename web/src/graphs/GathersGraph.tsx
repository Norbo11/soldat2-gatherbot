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
import {GamePopupContents, RoundPopupContents} from "./GamePopup";
import Input from "semantic-ui-react/dist/commonjs/elements/Input";
import {BaseType} from "d3-selection";


interface Props {
    gatherStats: GatherStatsPoint[],
    userCache: UserCache,
    fetchNewUser: (discordId: string) => void,
}


export const GathersGraph = ({gatherStats, userCache, fetchNewUser}: Props) => {

    const figureWidth = 1000
    const figureHeight = 450

    const d3Container = useRef(null)

    const [numDatesToDisplay, setNumDatesToDisplay] = useState(1000)
    const [numDatesToDisplayString, setNumDatesToDisplayString] = useState("1000")
    const [hoverGame, setHoverGame] = useState<Game | undefined>(undefined)

    useEffect(() => {
        if (gatherStats.length === 0) {
            return
        }

        const legendWidth = 100;

        // set the dimensions and margins of the graph
        const margin = {top: 50, right: 30, bottom: 70, left: 50}
        const width = figureWidth - margin.left - margin.right - legendWidth;
        const height = figureHeight - margin.top - margin.bottom;
        let bars: d3.Selection<SVGRectElement, Game, null, undefined>[] = []
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
                .domain([0, maxGames! + 1])
                .range([height, 0])
        }

        const filterData = (data: GatherStatsPoint[], minX: string, maxX: string) => {
            return _.filter(data, d => {
                return d.date >= minX && d.date <= maxX
            })
        }

        let x = getXScale(dataToDisplay)
        let y = getYScale(dataToDisplay)


        const drawXAxis = () => {
            const xAxis = graph.append("g")
                .attr("id", "xAxis")
                .attr("transform", "translate(0," + height + ")")
                .call(d3.axisBottom(x));

            xAxis.selectAll("text")
                .attr("y", 0)
                .attr("x", 9)
                .attr("dy", ".35em")
                .attr("transform", "rotate(90)")
                .attr("text-anchor", "start")

            xAxis.selectAll(".tick")
                .filter(d => {
                    if (typeof d === "string") {
                        const day = moment(d, "YYYY-MM-DD").get("day")
                        return day === 6 || day === 0;
                    }
                    return false;
                })
                .select("text")
                .attr("color", "red")
        }

        drawXAxis()

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

        const sizes = new Set<number>();

        const drawBars = () => {
            const gameBarHeight = y(0) - y(1);

            _.forEach(dataToDisplay, (item, j) => {
                _.forEach(_.sortBy(item.games, game => game.size), (game, i) => {
                    sizes.add(game.size)

                    // Add the line to the above group
                    const gameBar = group.append("rect")
                        .datum(game)
                        .attr("id", `gameBar${game.startTime}`)
                        .attr("fill", sizeColor(`${game.size}`))
                        .attr("stroke", "black")
                        .attr("stroke-width", "1")
                        .attr("x", x(item.date)!)
                        .attr("y", y(i) - gameBarHeight)
                        .attr("height", gameBarHeight)
                        .attr("width", x.bandwidth())

                    gameBar.on("mouseover", (e: d3.ClientPointEvent, d: Game) => {
                        const gameBoxWidth = 400
                        const gameBoxHeight = 200

                        // Make sure tooltips do not leave the bounds of the figure
                        const tooltipX = Math.max(0, Math.min(width - gameBoxWidth, x(item.date)! - gameBoxWidth / 2))
                        const tooltipY = Math.max(0, Math.min(height - gameBoxHeight, y(i)))

                        // This is controlled by React.createPortal in the render method of this component
                        group.insert("foreignObject")
                            .attr("id", `gameHoverBox${game.startTime}`)
                            .attr("x", tooltipX)
                            .attr("y", tooltipY)
                            .attr("width", gameBoxWidth)
                            .attr("height", gameBoxHeight)

                            // This ensures that when we draw the game box, we don't capture a mouseout event and
                            // immediately remove it
                            .attr("pointer-events", "none")

                        setHoverGame(game)
                    })

                    gameBar.on("mouseout", (e: d3.ClientPointEvent, d: Game) => {
                        graph.select(`#gameHoverBox${d.startTime}`).remove()
                        setHoverGame(undefined)
                    })

                    bars.push(gameBar)
                })
            })
        }

        drawBars()

        _.forEach(Array.from(sizes), (size, i) => {
            legend
                .append("circle")
                .datum(size)
                .attr("cx", width + 20)
                .attr("cy", d => i * 20) // 100 is where the first dot appears. 25 is the distance between dots
                .attr("r", 6)
                .style("fill", d => sizeColor(`${size}`))

            legend
                .append("text")
                .datum(size)
                .attr("x", width + 40)
                .attr("y", d => i * 20) // 100 is where the first dot appears. 25 is the distance between dots
                .style("fill", d => sizeColor(`${size}`))
                .text(d => `Size: ${d}`)
                .attr("text-anchor", "left")
                .style("alignment-baseline", "middle")
                .style("font-size", "14px")
        })

        const transitionGraph = (data: GatherStatsPoint[]) => {
            // Transition to new axis using the new domains
            yAxis.transition()
                .duration(1000)
                .call(d3.axisLeft(y));

            graph.select("#xAxis").remove()
            drawXAxis()

            _.forEach(bars, bar => {
                bar.remove()
            })

            drawBars()
        }

        function updateChart(event: D3BrushEvent<unknown>, d: unknown) {
            // This is the area that has been selected
            const extent = event.selection as [number, number]

            if (extent) {
                // If something was selected, filter the data to display
                const selectedDomain = x.domain().filter(d => x(d)! >= extent[0] && x(d)! <= extent[1])
                const minX = _.min(selectedDomain)!
                const maxX = _.max(selectedDomain)!

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

        // transitionGraph(dataToDisplay)
    }, [gatherStats, numDatesToDisplay])


    let portal = null;
    if (hoverGame !== undefined) {
        const hoverBoxElem = document.getElementById(`gameHoverBox${hoverGame.startTime}`)!

        portal = ReactDOM.createPortal(
            <GamePopupContents
                game={hoverGame}
                userCache={userCache}
                fetchNewUser={fetchNewUser}
                alpha={1.0}
            />, hoverBoxElem
        )
    }


    return (
        gatherStats.length === 0 ?
            <Dimmer active inverted>
                <Loader inverted>Loading...</Loader>
            </Dimmer>
            : <div>
                {portal}
                <h3>Gathers Over Time</h3>
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
                            /> Days
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

