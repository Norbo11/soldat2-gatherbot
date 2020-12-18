import React, {useEffect, useRef, useState} from "react";
import "./Ratings.css";
import {jStat} from "jstat";
import * as d3 from "d3";
import {RatingResponse} from "../util/api";
import _ from "lodash"
import {Checkbox, Form, Grid, Input, Loader, Radio, Segment} from "semantic-ui-react";
import Dimmer from "semantic-ui-react/dist/commonjs/modules/Dimmer";


interface NormalPoint {
    x: number,
    density: number
}

interface InputPoint {
    mu: number,
    sigma: number,
    i: number
}

interface EnrichedPoint extends InputPoint {
    left: number,
    right: number,
    muPercentage: number,
    leftPercentage: number,
    rightPercentage: number,
}

interface Props {
    ratings: RatingResponse[]
}


const normal = (mean: number,
                sd: number,
                start: number = mean - 4 * sd,
                end: number = mean + 4 * sd): NormalPoint[] => {

    const data: NormalPoint[] = [];
    for (let i = start; i <= end; i += 1) {
        data.push({
            x: i,
            density: jStat.normal.pdf(i, mean, sd)
        });
    }
    return data;
}

export function Ratings({ratings}: Props) {
    const d3Container = useRef(null)
    const [alignment, setAlignment] = useState("left")

    const figureWidth = 1500
    const figureHeight = 600

    useEffect(() => {

        const percentageForAlignment = (d: EnrichedPoint) => {
            if (alignment === "left") {
                return d.leftPercentage
            } else if (alignment === "right") {
                return d.rightPercentage
            } else {
                return d.muPercentage
            }
        }

        const xPositionForAlignment = (d: EnrichedPoint) => {
            if (alignment === "left") {
                return d.left
            } else if (alignment === "right") {
                return d.right
            } else {
                return d.mu
            }
        }


        if (!d3Container.current) {
            return
        }

        let globalMu = 50
        let globalSigma = 50 / 3

        const points: EnrichedPoint[] = ratings.map((d, i) => {
            const left = d.mu - 3 * d.sigma
            const right = d.mu + 3 * d.sigma
            const muPercentage = jStat.normal.cdf(d.mu, globalMu, globalSigma) * 100
            const leftPercentage = jStat.normal.cdf(left, globalMu, globalSigma) * 100
            const rightPercentage = jStat.normal.cdf(right, globalMu, globalSigma) * 100

            return {
                i,
                mu: d.mu,
                sigma: d.sigma,
                left,
                right,
                muPercentage,
                leftPercentage,
                rightPercentage
            }
        })

        const margin = {top: 30, right: 10, bottom: 30, left: 20}
        const width = figureWidth - margin.left - margin.right
        const height = figureHeight - margin.top - margin.bottom

        let normalPoints: NormalPoint[] = normal(globalMu, globalSigma);

        let minX = d3.min(normalPoints, d => d.x)!
        let maxX = d3.max(normalPoints, d => d.x)!
        let maxDensity = d3.max(normalPoints, d => d.density)!

        // Return a function that maps our q values to the width of our graph
        let x = d3.scaleLinear<number>()
            .domain([minX, maxX])
            .rangeRound([margin.left, width])
            .nice() // This extends the domain so that it starts and ends on nice round values

        // Return a function that maps our p values to the height of our graph
        let y = d3.scaleLinear<number>()
            .domain([0, maxDensity])
            .range([height, margin.top]);  // Height comes first because origin is at the top left of the graph

        let svg = d3.select(d3Container.current)

        svg.selectAll("*").remove()

        // Create a group for the X axis
        let gX = svg.append("g")
            .attr("class", "x axis")

            // Move it to the bottom of the graph
            .attr("transform", "translate(0," + height + ")")

            // Call the "axis" function over our xAxis group
            // The axis function is a "generator" which will generate the SVG elements that draw our axis
            .call(d3.axisBottom(x));

        // TODO: Ask the community about which of these colors is better
        const colorScale = d3.scaleLinear<d3.RGBColor, number>()
            // .domain([0, 50, 100])
            .domain([0, 100])
            // .range(["green", "red"])
            // .range()
            // .range(["#24c6dc", "#514a9d"])
            // .range([d3.rgb("#24c6dc").darker(), d3.rgb("#514a9d").darker()])
            .range([d3.rgb("#24c6dc").brighter(), d3.rgb("#514a9d").darker()])
        // .range(["#1FA2FF", "#12D8FA", "#A6FFCB"])
        // .range(["#1A2980", "#26D0CE"])
        // .range(["#E55D87", "#5FC3E4"])


        // Create a line where we map a datapoint to its X, Y location using the earlier scale
        let line = d3.line<NormalPoint>()
            .x(d => x(d.x))
            .y(d => y(d.density));

        // Append a linear gradient
        svg.append("linearGradient")
            .attr("id", "bellCurveGradient")
            .selectAll("stop")
            .data(normalPoints.map(x => {
                const percentage = (jStat.normal.cdf(x.x, globalMu, globalSigma) * 100)
                return {
                    offset: `${percentage}%`,
                    // Uncomment this to see what a regular gardient would look like without our "gaussian" gradient
                    // offset: `${x.x}%`
                    color: colorScale(percentage)
                }
            }))
            .enter().append("stop")
            .attr("offset", d => d.offset)
            .attr("stop-color", d => d.color)

        // Draw the lines, with fill
        const path = svg.append("path")
            .datum(normalPoints)
            .attr("class", "line")
            .attr("d", line)
            .style("fill", "url(#bellCurveGradient)")
            .style("opacity", "0.80")

        const pathFullOpacity = svg.append("path")
            .datum(normalPoints)
            .attr("class", "line")
            .attr("d", line)
            .style("fill", "url(#bellCurveGradient)")
            .style("opacity", "1.0")
            .style("visibility", "hidden")
            .attr("clip-path", `url(#clipPath)`) // Assign to our earlier clip path


        const circles = svg.selectAll("circles")
            .data(points)
            .enter()
            .append("circle")
            .attr("class", "point")
            .attr("id", (d, i) => `point${i}`)
            .attr("fill", d => colorScale(percentageForAlignment(d)))
            .attr("stroke", "black")
            .attr("cx", d => x(xPositionForAlignment(d)))
            .attr("cy", d => y(jStat.normal.pdf(xPositionForAlignment(d), globalMu, globalSigma)))
            .attr("r", 6)

        const handleMouseOverPoint = (e: d3.ClientPointEvent, d: EnrichedPoint) => {
            pathFullOpacity.style("visibility", "visible")

            // Interpolate a rectangular clipPath which will smoothly reveal the area underneath our point
            let clipPath = svg.append("clipPath")
                .attr("id", `clipPath`)
                .append("path")
                .datum([d.left, d.right]) // I think this is "datum" not "data" because we are drawing just 1 path
                .attr("class", "area")
                .attr("d", d3.area<number>()
                    .x(x(d.left))
                    .y0(y(0))
                    .y1(y(1))
                )
                .transition()
                .ease(d3.easePoly)
                .duration(1000)
                .attr("d", d3.area<number>()
                    .x(d => x(d))
                    .y0(y(0))
                    .y1(y(1))
                )

            circles
                .filter((_, i) => i !== d.i)
                .transition()
                .duration(1000)
                .style("opacity", "0")
        }

        const handleMouseOutPoint = (e: d3.ClientPointEvent, d: EnrichedPoint) => {
            d3.select(`#uncertaintyArea${d.i}`).remove();
            d3.select(`#clipPath`).remove();
            pathFullOpacity.style("visibility", "hidden")
            circles
                .filter((_, i) => i !== d.i)
                .transition()
                .duration(1000)
                .style("opacity", "1")
        }

        circles
            .on("mouseover", handleMouseOverPoint)
            .on("mouseout", handleMouseOutPoint)

    }, [ratings, d3Container.current, alignment])

    // Prevent double-rendering
    if (ratings.length === 0) {
        return (
            <Dimmer active inverted>
                <Loader inverted>Loading ratings graph...</Loader>
            </Dimmer>
        )
    }

    return (
        <div>
            <h3>Ratings</h3>

            <Form>
                <h5>Point Alignment</h5>
                <Form.Group widths={"equal"}>
                    <Form.Radio
                        inline
                        label={"Lower Ratings Estimate"}
                        value={"left"}
                        checked={alignment === "left"}
                        onChange={(e, {value}) => setAlignment(value as string)}
                    />
                    <Form.Radio
                        inline
                        label={"Skill Average"}
                        value={"mu"}
                        checked={alignment === "mu"}
                        onChange={(e, {value}) => setAlignment(value as string)}
                    />
                    <Form.Radio
                        inline
                        label={"Upper Ratings Estimate"}
                        value={"right"}
                        checked={alignment === "right"}
                        onChange={(e, {value}) => setAlignment(value as string)}
                    />
                </Form.Group>
            </Form>
            <div className={"svg-container"}>
                {ratings.length > 0 ? <svg
                    ref={d3Container}
                    preserveAspectRatio="xMinYMin meet"
                    viewBox={`0 0 ${figureWidth} ${figureHeight}`}
                    className={"svg-content-responsive"}
                /> : null}
            </div>
        </div>
    );
}
