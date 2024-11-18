fetch("./data.json")
  .then((response) => response.json())
  .then((data) => {
    const margin = { top: 20, right: 50, bottom: 50, left: 50 };
    const width = 1280 - margin.left - margin.right; // Adjusted width
    const height = 480 - margin.top - margin.bottom; // Adjusted height

    const tracks = data.trackResults.map((track) => ({
      time: track.time,
      score: track.scoreTotal,
      gold: track.goldTotal,
      exp: track.expTotal,
      enemies: track.enemies.map((e) => `${e.name} (x${e.amount})`).join(", "),
    }));

    // Add stage info above the chart
    const infoContainer = document.querySelector("#stage-info");
    infoContainer.innerHTML = `
            <h4>TinyChaos Stage Tracker</h4>
            <p><strong>Stage:</strong> ${data.stageName}</p>
            <p><strong>Character:</strong> ${data.character}</p>
            <p><strong>Version:</strong> ${data.version}</p>
        `;

    const svg = d3
      .select(".chart")
      .attr(
        "viewBox",
        `0 0 ${width + margin.left + margin.right} ${
          height + margin.top + margin.bottom
        }`
      )
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleLinear()
      .domain([0, d3.max(tracks, (d) => d.time)])
      .range([0, width]);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(tracks, (d) => Math.max(d.score, d.gold, d.exp))])
      .range([height, 0]);

    const xAxis = svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x));

    const yAxis = svg.append("g").call(d3.axisLeft(y));

    const tooltip = d3.select(".tooltip");

    const lines = [
      {
        key: "score",
        color: "steelblue",
        accessor: (d) => d.score,
        label: "Score",
      },
      { key: "gold", color: "gold", accessor: (d) => d.gold, label: "Gold" },
      { key: "exp", color: "lightgreen", accessor: (d) => d.exp, label: "EXP" },
    ];

    const lineGroup = svg.append("g").attr("class", "lines");

    lines.forEach(({ key, color, accessor }) => {
      // Draw the line
      lineGroup
        .append("path")
        .datum(tracks)
        .attr("class", `line ${key}-line`)
        .attr(
          "d",
          d3
            .line()
            .x((d) => x(d.time))
            .y((d) => y(accessor(d)))
        )
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 1.5);

      // Draw points
      svg
        .selectAll(`.${key}-point`)
        .data(tracks)
        .enter()
        .append("circle")
        .attr("class", `${key}-point`)
        .attr("cx", (d) => x(d.time))
        .attr("cy", (d) => y(accessor(d)))
        .attr("r", 3)
        .attr("fill", color)
        .on("mouseover", (event, d) => {
          tooltip
            .style("display", "block")
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 20}px`)
            .html(`<strong>Time:</strong> ${d.time}s<br>
                               <strong>${key}:</strong> ${accessor(d)}<br>
                               <strong>Enemies:</strong> ${d.enemies}`);
        })
        .on("mouseout", () => tooltip.style("display", "none"));
    });

    const zoom = d3
      .zoom()
      .scaleExtent([1, 10]) // Set zoom limits
      .translateExtent([
        [0, 0],
        [
          width + margin.left + margin.right,
          height + margin.top + margin.bottom,
        ],
      ])
      .on("zoom", (event) => {
        const transform = event.transform;

        // Rescale the X axis based on the zoom
        const newX = transform.rescaleX(x).clamp(true);

        // Rescale the Y axis for each category (score, gold, exp)
        const newY = transform.rescaleY(
          d3
            .scaleLinear()
            .domain([0, d3.max(tracks, (d) => d.gold)])
            .range([height, 0])
        ); // Apply zoom to the main Y axis

        // Update axes
        xAxis.call(d3.axisBottom(newX).ticks(5)); // Optional: Adjust the number of ticks if needed
        yAxis.call(d3.axisLeft(newY));

        // Update line positions for each category
        svg.selectAll(".score-line").attr("d", (d) =>
          d3
            .line()
            .x((d) => newX(d.time) + margin.left)
            .y((d) => newY(d.score) + margin.top)(d)
        );

        svg.selectAll(".gold-line").attr("d", (d) =>
          d3
            .line()
            .x((d) => newX(d.time) + margin.left)
            .y((d) => newY(d.gold) + margin.top)(d)
        );

        svg.selectAll(".exp-line").attr("d", (d) =>
          d3
            .line()
            .x((d) => newX(d.time) + margin.left)
            .y((d) => newY(d.exp) + margin.top)(d)
        );

        // Recalculate the positions of points (circles) for each category
        svg
          .selectAll(".score-point")
          .attr("cx", (d) => newX(d.time) + margin.left)
          .attr("cy", (d) => newY(d.score) + margin.top);

        svg
          .selectAll(".gold-point")
          .attr("cx", (d) => newX(d.time) + margin.left)
          .attr("cy", (d) => newY(d.gold) + margin.top);

        svg
          .selectAll(".exp-point")
          .attr("cx", (d) => newX(d.time) + margin.left)
          .attr("cy", (d) => newY(d.exp) + margin.top);

        // Create horizontal grid lines at fixed intervals along the Y-axis
        // Get the current Y-axis ticks (i.e., values) from the updated scale
        const yTicks = newY.ticks(); // Get the ticks from the rescaled Y-axis

        // Remove old grid lines
        svg.selectAll(".grid-line").remove();

        // Create new grid lines for each tick value in the Y-axis
        svg
          .selectAll(".grid-line")
          .data(yTicks)
          .join("line")
          .attr("class", "grid-line")
          .attr("x1", margin.left)
          .attr("x2", width + margin.left)
          .attr("y1", (d) => newY(d) + margin.top)
          .attr("y2", (d) => newY(d) + margin.top)
          .attr("stroke", "#444")
          .attr("stroke-dasharray", "2,2");
      });

    // Apply the zoom to the SVG container
    d3.select(".chart").call(zoom);

    // Adding toggle buttons for showing and hiding the lines
    const legend = d3.select("#legend");
    lines.forEach(({ key, color, label }) => {
      legend
        .append("button")
        .attr("class", "toggle-btn")
        .text(`Toggle ${label}`)
        .on("click", () => {
          const line = d3.select(`.${key}-line`);
          const points = d3.selectAll(`.${key}-point`);
          const hlines = d3.selectAll(`.${key}-hline`);
          const isHidden = line.style("display") === "none";

          line.style("display", isHidden ? null : "none");
          points.style("display", isHidden ? null : "none");
          hlines.style("display", isHidden ? null : "none");
        });
    });

  })
  .catch((error) => console.error("Error loading JSON:", error));
