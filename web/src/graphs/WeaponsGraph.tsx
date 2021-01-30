import {Button, Dimmer, Form, Grid} from "semantic-ui-react";
import Modal from "semantic-ui-react/dist/commonjs/modules/Modal";
import * as React from "react";
import {useEffect, useRef, useState} from "react";
import ReactDOM from "react-dom";
import {RatingUpdate, Round, UserResponse, WeaponStatsPoint} from "../util/api";
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
    weaponStats: WeaponStatsPoint[]
}


export const WeaponsGraph = ({weaponStats}: Props) => {

    const figureWidth = 1000
    const figureHeight = 450

    const d3Container = useRef(null)

    const [xAxisType, setXAxisType] = useState("rounds")
    const [numRoundsToDisplay, setNumRoundsToDisplay] = useState(1000)
    const [numRoundsToDisplayString, setNumRoundsToDisplayString] = useState("1000")

    useEffect(() => {
        if (weaponStats.length === 0) {
            return
        }

        // set the dimensions and margins of the graph
        const margin = {top: 50, right: 30, bottom: 30, left: 50}
        const width = figureWidth - margin.left - margin.right
        const height = figureHeight - margin.top - margin.bottom;
        const curveType = xAxisType === "rounds" ? d3.curveLinear : d3.curveStep
        const lines: d3.Selection<SVGPathElement, WeaponStatsPoint[], null, undefined>[] = []
        const color = d3.scaleOrdinal(d3.schemeCategory10);

        // append the svg object to the body of the page
        let svg = d3.select(d3Container.current)
        svg.selectAll("*").remove()

        let graph = svg
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        const data = weaponStats

        // Find the number of rounds to display based on numLastGames
        let dataToDisplay = _.takeRight(data, numRoundsToDisplay)

        const getXScale = (data: WeaponStatsPoint[]) => {
            if (xAxisType === "time") {
                const [min, max] = d3.extent(data, d => moment(d.startTime)) as Moment[]

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

        const getYScale = (data: WeaponStatsPoint[]) => {
            const latestPoint = data[data.length - 1]
            const maxKills = _.max(_.keys(latestPoint.weapons).map(weaponName => latestPoint.weapons[weaponName].kills))

            return d3.scaleLinear()
                .domain([0, maxKills!])
                .range([height, 0])
                .nice()
        }

        const getXValue = (d: WeaponStatsPoint) => {
            if (xAxisType === "time") {
                return moment(d.startTime)
            } else if (xAxisType === "rounds") {
                return d.roundNumber
            } else {
                throw Error(`Unexpected xAxisType: ${xAxisType}`)
            }
        }

        const filterData = (data: WeaponStatsPoint[], minX: number | Date, maxX: number | Date) => {
            if (xAxisType === "time") {
                return _.filter(data, d => {
                    const date = moment(d.startTime).toDate()
                    return date >= minX && date <= maxX
                })
            } else if (xAxisType === "rounds") {
                return _.filter(data, d => d.roundNumber >= minX && d.roundNumber <= maxX)
            } else {
                throw Error(`Unexpected xAxisType: ${xAxisType}`)
            }
        }

        const getLine = (weaponName: string) => {
            return d3.line<WeaponStatsPoint>()
                .x(d => x(getXValue(d)))
                .y(d => y(d.weapons[weaponName].kills))
                .curve(curveType)
        }

        let x = getXScale(dataToDisplay)
        let y = getYScale(dataToDisplay)

        const xAxis = graph.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x));

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

        // Create a group where both the line and the brush are drawn, link it to the earlier clip path
        const group = graph.append('g')
            .attr("clip-path", "url(#clip)")

        _.keys(weaponStats[0].weapons).map(weaponName => {
            // Add the line to the above group
            const line = group.append("path")
                .datum(data)
                .attr("fill", "none")
                .attr("stroke", color(weaponName))
                .attr("stroke-width", 2.0)
                .attr("d", getLine(weaponName))

            line.on("mouseover", () => {
                line.attr("stroke-width", 3.0)
            })

            line.on("mouseout", () => {
                line.attr("stroke-width", 2.0)
            })

            lines.push(line)
        })

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

        const transitionGraph = (data: WeaponStatsPoint[]) => {
            // Transition to new axis using the new domains
            yAxis.transition()
                .duration(1000)
                .call(d3.axisLeft(y));

            xAxis.transition()
                .duration(1000)
                .call(d3.axisBottom(x))

            // Transition to a new line. If the domain was 0-100 and then changed to 0-50, this essentially creates the
            // desired "zooming" effect by mapping a smaller domain over the same range (pixels on the screen).
            _.keys(weaponStats[0].weapons).map((weaponName, i) => {
                lines[i]
                    .transition()
                    .duration(1000)
                    .attr("d", getLine(weaponName))
            })
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
    }, [weaponStats, numRoundsToDisplay, xAxisType])

    return (
        weaponStats.length === 0 ?
            <Dimmer active inverted>
                <Loader inverted>Loading...</Loader>
            </Dimmer>
        : <div>
        <h3>Weapon Kills Over Time</h3>
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

                    <span>
                        Last <Input
                        value={numRoundsToDisplay}
                        style={{
                            width: "50px",
                        }}
                        onChange={(e) => {
                            setNumRoundsToDisplayString(e.target.value)

                            const newValue = parseInt(e.target.value)
                            if (!isNaN(newValue)) {
                                setNumRoundsToDisplay(Math.max(1, newValue))
                            }
                        }}
                    /> Rounds
                    </span>
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
        </div>
    )
}

