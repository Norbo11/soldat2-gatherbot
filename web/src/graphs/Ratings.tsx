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
    const statsBoxHeight = 300
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
            const muPercentage = jStat.normal.cdf(d.mu, globalMu, globalSigma) * 100
            const leftPercentage = jStat.normal.cdf(left, globalMu, globalSigma) * 100
            const rightPercentage = jStat.normal.cdf(right, globalMu, globalSigma) * 100

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
        // .clamp(true)
        // .nice() // This extends the domain so that it starts and ends on nice round values

        // Return a function that maps our p values to the height of our graph
        let y = d3.scaleLinear<number>()
            .domain([0, maxDensity])
            .range([height, margin.top])  // Height comes first because origin is at the top left of the graph
        // .clamp(true)

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
            .attr("fill", d => colorScale(d.xPos))
            .attr("stroke", "black")
            .attr("cx", d => x(d.xPos))
            .attr("cy", d => y(jStat.normal.pdf(d.xPos, globalMu, globalSigma)))
            .attr("r", 6)

        const boxToggles = points.map(_ => false)

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


            let hoverLine = d3.line<HoverLinePoint>()
                .x(d => x(d.x))
                .y(d => y(d.y));

            // let {m, c} = perpendicularToNormal(globalMu, globalSigma, xPos)
            // const firstX = -20
            // const lastX = 120
            // const perpendicularPoints = [straightLinePoints(m, c, firstX), straightLinePoints(m, c, lastX)]
            // (-20, -0.031348623135028925) -> (20, 1208.0580317747126) Ratings.tsx:288
            // (120, 0.08901343491960517) -> (1470, -1356.9298867691095)
            //
            // console.log(`xPos: ${xPos}`)
            // console.log(`firstX: ${firstX}`)
            // console.log(`lastX: ${lastX}`)
            // console.log(`y=${m}x + ${c}`)
            // console.log(`(${perpendicularPoints[0].x}, ${perpendicularPoints[0].y}) -> (${x(perpendicularPoints[0].x)}, ${y(perpendicularPoints[0].y)})`)
            // console.log(`(${perpendicularPoints[1].x}, ${perpendicularPoints[1].y}) -> (${x(perpendicularPoints[1].x)}, ${y(perpendicularPoints[1].y)})`)
            // console.log(`maxDensity: ${maxDensity}`)

            const perpendicularPoints = [
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

            console.log(`(${perpendicularPoints[0].x}, ${perpendicularPoints[0].y}) -> (${x(perpendicularPoints[0].x)}, ${y(perpendicularPoints[0].y)})`)
            console.log(`(${perpendicularPoints[1].x}, ${perpendicularPoints[1].y}) -> (${x(perpendicularPoints[1].x)}, ${y(perpendicularPoints[1].y)})`)

            const playerStatsDrawing = svg.insert("g", `#points${d.i}`)
                .attr("id", `playerStatsDrawing${d.i}`)
                .style("opacity", "0")

            playerStatsDrawing.transition()
                .duration(1000)
                .style("opacity", "1")

            playerStatsDrawing.append("path")
                .datum(perpendicularPoints)
                .attr("stroke", "black")
                .attr("fill", "none")
                .attr("d", hoverLine)

            fetchNewUser(d.stats.discordId)
            const user = userCache[d.stats.discordId]

            const onCloseClick = () => {
                console.log("clicked")
                d3.select(`#playerStatsDrawing${d.i}`)
                    .remove()
                // .transition()
                // .duration(1000)
                // .attr("width", statsBoxWidth)
                // .attr("height", statsBoxHeight)
            }

            if (user !== undefined) {
                console.log(moment().valueOf())
                console.log(user.playerStats.firstGameTimestamp)
            }

            playerStatsDrawing.append("foreignObject")
                .attr("id", `playerStatsBox${d.i}`)
                .attr("x", x(d.lastX) - statsBoxWidth / 2)
                .attr("y", y(jStat.normal.pdf(d.xPos, globalMu, globalSigma)) - statsBoxHeight / 2)
                .attr("width", statsBoxWidth)
                .attr("height", statsBoxHeight)
                .html(ReactDOMServer.renderToStaticMarkup(
                    <div style={{margin: "5px", height: "95%"}}>
                        {/*<Card style={{position: "absolute", bottom: 0}} fluid>*/}
                        {user !== undefined ? <Card style={{height: "100%"}} fluid>
                            {/*<Image src={profile_pic} wrapped ui={false} avatar style={{width: "50px", height: "50px"}}/>*/}
                            <Card.Content>
                                <Card.Header>
                                    <Image src={user.avatarUrl} wrapped ui={false} avatar/>
                                    {user.displayName}
                                </Card.Header>
                                <Card.Meta>
                                    <span
                                        className='date'>First Gather: {moment(user.playerStats.firstGameTimestamp).format("DD-MM-YYYY")}</span>
                                </Card.Meta>
                                <Card.Content>
                                    <List>
                                        <List.Item>
                                            <List.Icon name={"gamepad"}/>
                                            <List.Content>
                                                Games Played: {user.playerStats.totalGames}
                                            </List.Content>
                                        </List.Item>
                                        <List.Item>
                                            <List.Icon name={"gamepad"}/>
                                            <List.Content>
                                                Rounds Played: {user.playerStats.totalRounds}
                                            </List.Content>
                                        </List.Item>
                                        <List.Item>
                                            <List.Icon name={"trophy"}/>
                                            <List.Content>
                                                Games Won: {user.playerStats.wonGames}
                                            </List.Content>
                                        </List.Item>
                                    </List>
                                    <List divided relaxed>
                                        <p>Last 5 Games</p>
                                        {d.stats.lastGames.map(game => {
                                            return (
                                                <List.Item key={game.startTime}>
                                                    <List.Content>
                                                        <List.Description as='a'>
                                                            {game.blueRoundWins} - {game.redRoundWins} ({moment.duration(moment().valueOf() - game.startTime).humanize()} ago)
                                                        </List.Description>
                                                    </List.Content>
                                                </List.Item>
                                            )
                                        })}

                                    </List>
                                </Card.Content>
                            </Card.Content>
                            {/*<Card.Content extra>*/}
                            {/*    <a>*/}
                            {/*        <Icon name='user'/>*/}
                            {/*        22 Friends*/}
                            {/*    </a>*/}
                            {/*</Card.Content>*/}
                        </Card> : (
                            <Dimmer active inverted>
                                <Loader inverted>Loading player...</Loader>
                            </Dimmer>
                        )}
                    </div>
                ))

            // playerStatsDrawing.on("mouseout", onCloseClick)
            // .attr("class", "ui segment")
            // .attr("xmlns", "http://www.w3.org/1999/xhtml")
            // .text("hello there")


            // playerStatsBox.append("div")
            //     .attr("class", "ui segment")
            //     .append("p")
            //     .text("hello")
        }

        const handleMouseOutPoint = (e: d3.ClientPointEvent, d: EnrichedPoint) => {
            d3.select(`#uncertaintyArea${d.i}`).remove();
            d3.select(`#clipPath`).remove();

            if (!boxToggles[d.i]) {
                d3.select(`#playerStatsDrawing${d.i}`)
                    .transition()
                    .duration(1000)
                    .style("opacity", 0)
                    .remove()
            }

            pathFullOpacity.style("visibility", "hidden")
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
                // statsBox.select(".card")
                //     .style("bottom", null)
                //     .style("top", "0")

                statsBox
                    .transition()
                    .duration(1000)
                    .attr("width", width * 3)
                    .attr("height", height * 1.4)
                // .attr("x", margin.left)
                // .attr("y", margin.top)
            } else {
                // statsBox.select(".card")
                //     .style("bottom", "0")
                //     .style("top", null)

                statsBox
                    .transition()
                    .duration(1000)
                    .attr("width", statsBoxWidth)
                    .attr("height", statsBoxHeight)
                // .attr("x", x(d.lastX) - statsBoxWidth / 2)
                // .attr("y", y(jStat.normal.pdf(d.xPos, globalMu, globalSigma)) - statsBoxHeight - 10)
            }
        }

        circles
            .on("mouseover", handleMouseOverPoint)
            .on("mouseout", handleMouseOutPoint)
            .on("click", handleMouseClickPoint)
        // .on("mouseup", handleMouseOverPoint)
        // .on("mouseout", handleMouseOutPoint)

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

            <Container>
                <Form>
                    <Form.Group inline>
                        <Form.Input
                            width={6}
                            label={"Search"}
                            placeholder={"Enter player names..."}
                        />
                        <label>Point Alignment</label>
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
