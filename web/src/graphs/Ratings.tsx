import React, {useRef, useState} from "react";
import ReactDOMServer from "react-dom/server"
import "./Ratings.css";
import {jStat} from "jstat";
import * as d3 from "d3";
import {RatingResponse} from "../util/api";
import {Button, Card, Container, Form, Icon, Image, List, Loader} from "semantic-ui-react";
import Dimmer from "semantic-ui-react/dist/commonjs/modules/Dimmer";
import moment from "moment"
import {UserCache} from "../App";
import useDeepCompareEffect from "use-deep-compare-effect";
import {RatingCard} from "./RatingCard";

interface NormalPoint {
    x: number,
    density: number
}

interface HoverLinePoint {
    x: number,
    y: number
}

interface InputPoint {
    mu: number,
    sigma: number,
    i: number
}

interface EnrichedPoint extends InputPoint {
    stats: RatingResponse,
    left: number,
    right: number,
    muPercentage: number,
    leftPercentage: number,
    rightPercentage: number,
    lastX: number,
    xPos: number,
}

interface Props {
    ratings: RatingResponse[],
    userCache: UserCache,
    fetchNewUser: (discordId: string) => void
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

const perpendicularToNormal = (globalMu: number, globalSigma: number, x: number) => {
    // From: https://math.stackexchange.com/questions/461139/differential-of-normal-distribution

    const x2 = x - globalMu

    const numerator = x2 * (Math.exp((-Math.pow(x2, 2)) / (2 * Math.pow(globalSigma, 2))))
    const denominator = Math.pow(globalSigma, 3) * Math.sqrt(2 * Math.PI)
    const gradient = -(numerator / denominator)
    // const m = - 1 / gradient
    const m = -1 / gradient

    console.log(globalMu)
    console.log(globalSigma)
    console.log(x)
    console.log(gradient)
    console.log(m)

    const y = jStat.normal.pdf(x, globalMu, globalSigma)
    const c = y - m * x
    return {m, c}
}

const straightLinePoints = (m: number, c: number, x: number) => {
    return {
        x,
        y: m * x + c
    }
}

export function Ratings({ratings, userCache, fetchNewUser}: Props) {
    const d3Container = useRef(null)
    const [alignment, setAlignment] = useState("left")

    const figureWidth = 1500
    const figureHeight = 800

    const statsBoxWidth = 250
    const statsBoxHeight = 400
    const lineLength = 20

    useDeepCompareEffect(() => {

        const percentageForAlignment = (d: EnrichedPoint) => {
            if (alignment === "left") {
                return d.leftPercentage
            } else if (alignment === "right") {
                return d.rightPercentage
            } else {
                return d.muPercentage
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
            const muPercentage = jStat.normal.cdf(d.mu, globalMu, globalSigma)
            const leftPercentage = jStat.normal.cdf(left, globalMu, globalSigma)
            const rightPercentage = jStat.normal.cdf(right, globalMu, globalSigma)

            let xPos

            if (alignment === "left") {
                xPos = left
            } else if (alignment === "right") {
                xPos = right
            } else {
                xPos = d.mu
            }

            const lastX = xPos < globalMu ? xPos - lineLength : xPos + lineLength

            return {
                i,
                mu: d.mu,
                sigma: d.sigma,
                left,
                right,
                muPercentage,
                leftPercentage,
                rightPercentage,
                stats: d,
                xPos,
                lastX
            }
        })

        const margin = {top: 200, right: 10, bottom: 30, left: 20}
        const width = figureWidth - margin.left - margin.right
        const height = figureHeight - margin.top - margin.bottom

        let normalPoints: NormalPoint[] = normal(globalMu, globalSigma);

        let minX = d3.min(normalPoints, d => d.x)!
        let maxX = d3.max(normalPoints, d => d.x)!
        let maxDensity = d3.max(normalPoints, d => d.density)!

        const lineUpLength = maxDensity * 0.03

        // Return a function that maps our q values to the width of our graph
        let x = d3.scaleLinear<number>()
            .domain([minX, maxX])
            .rangeRound([margin.left, width])
            .nice() // This extends the domain so that it starts and ends on nice round values

        // Return a function that maps our p values to the height of our graph
        let y = d3.scaleLinear<number>()
            .domain([0, maxDensity])
            .range([height, margin.top])  // Height comes first because origin is at the top left of the graph

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
            .domain([0, 100])
            .range([d3.rgb("#24c6dc").brighter(), d3.rgb("#514a9d").darker()])

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
            .attr("fill", d => colorScale(d.xPos))
            .attr("stroke", "black")
            .attr("cx", d => x(d.xPos))
            .attr("cy", d => y(jStat.normal.pdf(d.xPos, globalMu, globalSigma)))
            .attr("r", 6)

        const boxToggles = points.map(_ => false)

        const handleMouseOverPoint = (e: d3.ClientPointEvent, d: EnrichedPoint) => {
            fetchNewUser(d.stats.discordId)
            const user = userCache[d.stats.discordId]

            if (user !== undefined) {
                // Fade out all other circles
                circles
                    .filter((_, i) => i !== d.i)
                    .transition()
                    .duration(1000)
                    .style("opacity", "0")

                // Draw an arrow
                const arrowLine = d3.line<HoverLinePoint>()
                    .x(d => x(d.x))
                    .y(d => y(d.y));

                const arrow = (x: number, y: number, arrowWidth: number, right = false) => {
                    return [
                        {
                            x: right ? d.right - arrowWidth : d.left + arrowWidth,
                            y: 0.06 * maxDensity
                        },
                        {
                            x,
                            y
                        },
                        {
                            x: right ? d.right - arrowWidth : d.left + arrowWidth,
                            y: 0.03 * maxDensity
                        },
                        {
                            x,
                            y
                        },
                    ]
                }

                const gapBetweenEdgeAndArrows = 1
                const arrowYPosition = 0.045 * maxDensity

                const arrowLinePoints = [
                    // {
                    //     x: d.mu,
                    //     y: jStat.normal.pdf(d.mu, globalMu, globalSigma)
                    // },
                    // {
                    //     x: d.mu,
                    //     y: 0.045 * maxDensity
                    // },
                    {
                        x: d.left + gapBetweenEdgeAndArrows,
                        y: 0.045 * maxDensity
                    },
                    ...arrow(d.left + gapBetweenEdgeAndArrows, arrowYPosition, 1.5),
                    {
                        x: d.right - gapBetweenEdgeAndArrows,
                        y: 0.045 * maxDensity
                    },
                    ...arrow(d.right - gapBetweenEdgeAndArrows, arrowYPosition, 1.5, true),
                ]

                const arrowLineGroup = svg.append("g")
                    .attr("id", "arrowLine")
                    .attr("clip-path", "url(#clipPath)")

                arrowLineGroup.append("path")
                    .datum(arrowLinePoints)
                    .attr("stroke", "black")
                    .attr("fill", "none")
                    .attr("d", arrowLine)
                    .attr("clip-path", "url(#clipPath)")

                arrowLineGroup.append("text")
                    .attr("x", x(d.left + gapBetweenEdgeAndArrows + 0.5))
                    .attr("y", y(arrowYPosition) - 22)
                    .text(`TrueSkill: ${d.left.toFixed(2)} - ${d.right.toFixed(2)}`)

                arrowLineGroup.append("text")
                    .attr("x", x(d.left + gapBetweenEdgeAndArrows + 0.5))
                    .attr("y", y(arrowYPosition) - 10)
                    .text(`Better than ${(d.leftPercentage * 100).toFixed(1)}% - ${(d.rightPercentage * 100).toFixed(1)}%`)

                // Make the "full opacity" version of the background visible
                pathFullOpacity.style("visibility", "visible")

                // Interpolate a rectangular clipPath which will smoothly reveal the area underneath our point
                svg.append("clipPath")
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
            }

            // Draw the player stats drawing (with a line going out from the point). We do this even before
            // we've loaded a user, in order to show the loading bar
            let hoverLine = d3.line<HoverLinePoint>()
                .x(d => x(d.x))
                .y(d => y(d.y));

            const linePoints = [
                {
                    x: d.xPos,
                    y: jStat.normal.pdf(d.xPos, globalMu, globalSigma)
                },
                {
                    x: d.lastX,
                    y: jStat.normal.pdf(d.xPos, globalMu, globalSigma)
                },
                {
                    x: d.lastX,
                    y: jStat.normal.pdf(d.xPos, globalMu, globalSigma) + lineUpLength
                }
            ]

            const playerStatsDrawing = svg.insert("g", `#points${d.i}`)
                .attr("id", `playerStatsDrawing${d.i}`)
                .style("opacity", "0")

            playerStatsDrawing.transition()
                .duration(1000)
                .style("opacity", "1")

            playerStatsDrawing.append("path")
                .datum(linePoints)
                .attr("stroke", "black")
                .attr("fill", "none")
                .attr("d", hoverLine)

            playerStatsDrawing.append("foreignObject")
                .attr("id", `playerStatsBox${d.i}`)
                .attr("x", x(d.lastX) - statsBoxWidth / 2)
                .attr("y", y(jStat.normal.pdf(d.xPos, globalMu, globalSigma)) - statsBoxHeight / 2)
                .attr("width", statsBoxWidth)
                .attr("height", statsBoxHeight)
                .html(ReactDOMServer.renderToStaticMarkup(<RatingCard user={user}/>))
        }

        const handleMouseOutPoint = (e: d3.ClientPointEvent, d: EnrichedPoint) => {
            d3.select(`#uncertaintyArea${d.i}`).remove();
            d3.select(`#clipPath`).remove();
            d3.select(`#arrowLine`).remove();

            if (!boxToggles[d.i]) {
                d3.select(`#playerStatsDrawing${d.i}`)
                    .transition()
                    .duration(1000)
                    .style("opacity", 0)
                    .remove()
            }

            // Hide the full opacity area
            pathFullOpacity.style("visibility", "hidden")

            // Make faded-out circles visible again
            circles
                .filter((_, i) => i !== d.i)
                .transition()
                .duration(1000)
                .style("opacity", "1")
        }

        const handleMouseClickPoint = (e: d3.ClientPointEvent, d: EnrichedPoint) => {
            boxToggles[d.i] = !boxToggles[d.i]

            const statsBox = d3.select(`#playerStatsBox${d.i}`)

            const width = parseInt(statsBox.attr("width"))
            const height = parseInt(statsBox.attr("height"))

            if (boxToggles[d.i]) {
                statsBox
                    .transition()
                    .duration(1000)
                    .attr("width", width * 3)
                    .attr("height", height * 1.4)
            } else {

                statsBox
                    .transition()
                    .duration(1000)
                    .attr("width", statsBoxWidth)
                    .attr("height", statsBoxHeight)
            }
        }

        circles
            .on("mouseover", handleMouseOverPoint)
            .on("mouseout", handleMouseOutPoint)
            // TODO: Re-enable when ready
            // .on("click", handleMouseClickPoint)

    }, [ratings, d3Container.current, alignment, userCache])

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
            <h1>Soldat 2 Gather Ratings</h1>
            <p>Note: this site is currently under construction. It will contain a lot more than just this graph.
            Send your suggestions to Norbo!</p>

            <Container>
                <Form>
                    <Form.Group inline>
                        <Form.Input
                            width={6}
                            label={"Search"}
                            // placeholder={"Enter player names..."}
                            placeholder={"Currently under construction..."}
                        />
                        <label>Point Alignment</label>
                        <Form.Radio
                            inline
                            label={"Lower TrueSkill Estimate"}
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
                            label={"Upper TrueSkill Estimate"}
                            value={"right"}
                            checked={alignment === "right"}
                            onChange={(e, {value}) => setAlignment(value as string)}
                        />
                    </Form.Group>
                </Form>
            </Container>
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
