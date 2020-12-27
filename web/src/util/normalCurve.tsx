import {jStat} from "jstat";
import * as d3 from "d3";

export const GLOBAL_MU = 50
export const GLOBAL_SIGMA = 50 / 3


export interface NormalPoint {
    x: number,
    density: number
}

export const normal = (mean: number,
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

export const getNormalColorScale = () => {
    return d3.scaleLinear<d3.RGBColor, number>()
        .domain([0, 100])
        .range([d3.rgb("#24c6dc").brighter(), d3.rgb("#514a9d").darker()])
}