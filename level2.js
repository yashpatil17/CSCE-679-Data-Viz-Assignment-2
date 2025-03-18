// Set up dimensions and margins
const margin = { top: 50, right: 50, bottom: 50, left: 100 };
const width = 800 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

// Create the main SVG container
const svg = d3.select("#heatmap")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

// Default to max temperature
let currentMetric = "max_temperature";
document.getElementById("tempToggle").checked = true;

// Select tooltip element for displaying data on hover
const tooltip = d3.select(".tooltip");

// Load CSV data
d3.csv("temperature_daily.csv").then(data => {
    // Parse date and convert temperature values to numbers
    data.forEach(d => {
        let [year, month, day] = d.date.split("-").map(Number);
        d.year = year;
        d.month = month;
        d.day = day;
        d.max_temperature = +d.max_temperature;
        d.min_temperature = +d.min_temperature;
    });

    // Get the last 10 years
    const allYears = [...new Set(data.map(d => d.year))].sort((a, b) => b - a);
    const last10Years = allYears.slice(0, 10); // Keep only the latest 10 years

    // Filter data for last 10 years
    const filteredData = data.filter(d => last10Years.includes(d.year));

    // Aggregate temperature data by year and month
    let aggregatedData = d3.rollup(
        filteredData,
        v => ({
            max_temperature: d3.max(v, d => d.max_temperature),
            min_temperature: d3.min(v, d => d.min_temperature),
            days: v
        }),
        d => d.year, d => d.month
    );

    // Convert aggregated data to an array for easier processing
    let heatmapData = [];
    aggregatedData.forEach((months, year) => {
        months.forEach((temps, month) => {
            heatmapData.push({
                year: year,
                month: month,
                days: temps.days,
                max_temperature: temps.max_temperature,
                min_temperature: temps.min_temperature
            });
        });
    });

    const years = last10Years.sort((a, b) => a - b); // Sort years in ascending order
    const months = d3.range(1, 13);

    // Compute initial min and max values for color scale
    const initialMin = d3.min(heatmapData, d => currentMetric === "max_temperature" ? d.max_temperature : d.min_temperature);
    const initialMax = d3.max(heatmapData, d => currentMetric === "max_temperature" ? d.max_temperature : d.min_temperature);

    // Compute global min and max values
    const globalMin = d3.min(heatmapData, d => d.min_temperature);
    const globalMax = d3.max(heatmapData, d => d.max_temperature);

    // Define scales
    const xScale = d3.scaleBand().domain(years).range([0, width]).padding(0.05);
    const yScale = d3.scaleBand().domain(months).range([0, height]).padding(0.05);
    const colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
        .domain([initialMin, initialMax]);

    // LEGEND SETUP
    const legendWidth = 300;
    const legendHeight = 20;
    const legendSvg = d3.select("#legend")
        .attr("width", legendWidth + 40)
        .attr("height", 70)
        .append("g")
        .attr("transform", "translate(20,10)");

    const legendScale = d3.scaleLinear()
        .domain([initialMin, initialMax])
        .range([0, legendWidth]);

    const legendAxis = d3.axisBottom(legendScale).ticks(5).tickFormat(d3.format(".1f"));

    // Create gradient for legend
    const defs = legendSvg.append("defs");
    const linearGradient = defs.append("linearGradient")
        .attr("id", "legendGradient")
        .attr("x1", "0%").attr("y1", "0%")
        .attr("x2", "100%").attr("y2", "0%");

    // Define gradient stops for color transition
    linearGradient.selectAll("stop")
        .data([
            { offset: "0%", color: d3.interpolateYlOrRd(0) },
            { offset: "50%", color: d3.interpolateYlOrRd(0.5) },
            { offset: "100%", color: d3.interpolateYlOrRd(1) }
        ])
        .enter().append("stop")
        .attr("offset", d => d.offset)
        .attr("stop-color", d => d.color);

    // Draw legend gradient
    legendSvg.append("rect")
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legendGradient)");

    // Add legend axis and labels
    legendSvg.append("g")
        .attr("transform", `translate(0, ${legendHeight})`)
        .call(legendAxis);

    // Min temp
    legendSvg.append("text")
        .attr("class", "legend-text")
        .attr("x", -17)
        .attr("y", legendHeight + 17)
        .style("text-anchor", "start")
        .style("font-size", "10px")
        .text(initialMin.toFixed(1));

    // Max temp
    legendSvg.append("text")
        .attr("class", "legend-text")
        .attr("x", legendWidth + 17)
        .attr("y", legendHeight + 17)
        .style("text-anchor", "end")
        .style("font-size", "10px")
        .text(initialMax.toFixed(1));

    // Add label to temperature range legend
    legendSvg.append("text")
        .attr("x", legendWidth / 2)
        .attr("y", legendHeight + 35)
        .attr("text-anchor", "middle")
        .style("font-size", "10px")
        .text("Temperature Range (°C)");

    // Create the line legend
    const lineLegendSvg = d3.select("#lineLegend")
        .attr("width", 150)
        .attr("height", 70)
        .style("position", "absolute")
        .style("top", "50%")
        .style("right", "200px")
        .style("transform", "translateY(-50%)")
        .style("background", "white")
        .style("border", "1px solid #ddd")
        .style("border-radius", "5px")
        .style("padding", "5px");

    // Add legend title
    lineLegendSvg.append("text")
        .attr("x", 75)
        .attr("y", 15)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .text("Daily Temperature");

    // Add line legend items
    lineLegendSvg.append("line")
        .attr("x1", 10)
        .attr("y1", 35)
        .attr("x2", 40)
        .attr("y2", 35)
        .attr("stroke", "#003366")
        .attr("stroke-width", 2);

    lineLegendSvg.append("text")
        .attr("x", 45)
        .attr("y", 38)
        .text("Max Temperature")
        .style("font-size", "12px");

    lineLegendSvg.append("line")
        .attr("x1", 10)
        .attr("y1", 55)
        .attr("x2", 40)
        .attr("y2", 55)
        .attr("stroke", "#66ccff")
        .attr("stroke-width", 2);

    lineLegendSvg.append("text")
        .attr("x", 45)
        .attr("y", 58)
        .text("Min Temperature")
        .style("font-size", "12px");

    // Draw heatmap cells
    const cells = svg.selectAll(".cell")
        .data(heatmapData)
        .enter().append("g")
        .attr("class", "cell")
        .attr("transform", d => `translate(${xScale(d.year)}, ${yScale(d.month)})`);

    // Interactive tooltip
    cells.append("rect")
        .attr("width", xScale.bandwidth())
        .attr("height", yScale.bandwidth())
        .attr("fill", d => colorScale(d[currentMetric]))
        .on("mouseover", function (event, d) {
            tooltip
                .style("display", "block")
                .html(`Year: ${d.year}, Month: ${d.month} <br> Max: ${d.max_temperature.toFixed(1)}°C <br> Min: ${d.min_temperature.toFixed(1)}°C`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", function () {
            tooltip.style("display", "none");
        });

    // Add mini line charts
    cells.each(function (d) {
        const cellGroup = d3.select(this);
        const cellWidth = xScale.bandwidth();
        const cellHeight = yScale.bandwidth();
        const padding = 3;

        const daysInMonth = d.days.length;
        const dayScale = d3.scaleLinear().domain([1, daysInMonth]).range([padding, cellWidth - padding]);
        const tempScale = d3.scaleLinear()
            .domain([globalMin, globalMax])
            .range([cellHeight - padding, padding]);

        const maxLineData = d.days.map(day => ({ x: dayScale(day.day), y: tempScale(day.max_temperature) }));
        const minLineData = d.days.map(day => ({ x: dayScale(day.day), y: tempScale(day.min_temperature) }));

        const lineMax = d3.line()
            .x(d => d.x)
            .y(d => d.y)
            .curve(d3.curveLinear);

        const lineMin = d3.line()
            .x(d => d.x)
            .y(d => d.y)
            .curve(d3.curveLinear);

        cellGroup.append("path")
            .datum(maxLineData)
            .attr("d", lineMax)
            .attr("fill", "none")
            .attr("stroke", "#003366")
            .attr("stroke-width", 2);

        cellGroup.append("path")
            .datum(minLineData)
            .attr("d", lineMin)
            .attr("fill", "none")
            .attr("stroke", "#66ccff")
            .attr("stroke-width", 2);
    });

    // Add Axes
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));

    svg.append("g")
        .call(d3.axisLeft(yScale).tickFormat(d => d3.timeFormat("%B")(new Date(2000, d - 1, 1))));

    // Title
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text("Temperature Heatmap by Year and Month along with Daily Changes");

    // Toggle switch for min max
    d3.select("#tempToggle").on("change", function () {
        currentMetric = this.checked ? "max_temperature" : "min_temperature";

        // Update the min max temp
        const newMin = d3.min(heatmapData, d => d[currentMetric]);
        const newMax = d3.max(heatmapData, d => d[currentMetric]);

        // Update the color scale domain
        colorScale.domain([newMin, newMax]);

        // Update heatmap cells
        cells.select("rect")
            .transition()
            .duration(500)
            .attr("fill", d => colorScale(d[currentMetric]));

        // Update the legend scale
        legendScale.domain([newMin, newMax]);

        // Update legend axis
        legendSvg.select("g")
            .call(d3.axisBottom(legendScale).ticks(5).tickFormat(d3.format(".1f")));

        // Update start and end values on the legend
        legendSvg.selectAll(".legend-text").remove();  // Remove previous text elements

        // Add start value (min)
        legendSvg.append("text")
            .attr("class", "legend-text")
            .attr("x", -17)
            .attr("y", legendHeight + 17)
            .style("text-anchor", "start")
            .style("font-size", "10px")
            .text(newMin.toFixed(1));

        // Add end value (max)
        legendSvg.append("text")
            .attr("class", "legend-text")
            .attr("x", legendWidth + 17)
            .attr("y", legendHeight + 17)
            .style("text-anchor", "end")
            .style("font-size", "10px")
            .text(newMax.toFixed(1));
    });
});