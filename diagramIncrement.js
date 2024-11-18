fetch("./data.json")
  .then((response) => response.json())
  .then((data) => {
    const margin = { top: 20, right: 50, bottom: 50, left: 50 };
    const width = 1280 - margin.left - margin.right; // Adjusted width
    const height = 480 - margin.top - margin.bottom; // Adjusted height

    // Calculate increments (differences between consecutive data points)
    const tracks = data.trackResults.map((track, index) => {
      if (index === 0) {
        return {
          time: track.time,
          score: track.scoreTotal,
          gold: track.goldTotal,
          exp: track.expTotal,
          enemyAmountSpawned: track.amount,
          enemies: track.enemies
            .map((e) => `${e.name} (x${e.amount})`)
            .join(", "),
        }; // First point has no increment, so set to 0
      }

      // For subsequent indices, sum all previous values
      const prevTrack = data.trackResults.slice(0, index);

      return {
        time: track.time,
        score:
          prevTrack.reduce((sum, t) => sum + t.scoreTotal, 0) +
          track.scoreTotal,
        gold:
          prevTrack.reduce((sum, t) => sum + t.goldTotal, 0) + track.goldTotal,
        exp: prevTrack.reduce((sum, t) => sum + t.expTotal, 0) + track.expTotal,
        enemies: track.enemies
          .map((e) => `${e.name} (x${e.amount})`)
          .join(", "),
        enemyAmountSpawned:
          prevTrack.reduce((sum, t) => sum + t.amount, 0) + track.amount, // Sum of all previous enemy amounts + current amount
      };
    });

    // Calculate the total amount of enemies spawned
    const totalEnemyAmountSpawned = tracks.reduce(
      (sum, track) => track.enemyAmountSpawned,
      0
    );

    // Add stage info above the chart
    const infoContainer = document.querySelector("#stage-info");
    infoContainer.innerHTML = `
            <h4>TinyChaos Stage Tracker</h4>
            <p><strong>Stage:</strong> ${data.stageName}</p>
            <p><strong>Character:</strong> ${data.character}</p>
            <p><strong>Version:</strong> ${data.version}</p>
            <p><strong>Total Enemies Spawned:</strong> ${totalEnemyAmountSpawned}</p>
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
      .domain([
        0,
        d3.max(tracks, (d) =>
          Math.max(d.score, d.gold, d.exp, d.enemyAmountSpawned)
        ),
      ])
      .range([height, 0]);

    const xAxis = svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x));

    const yAxis = svg.append("g").call(d3.axisLeft(y));

    const tooltip = d3.select(".tooltip");

    const lines = [
      {
        key: "Score",
        color: "steelblue",
        accessor: (d) => d.score,
        label: "Score",
      },
      {
        key: "Soul-Point",
        color: "gold",
        accessor: (d) => d.gold,
        label: "Gold",
      },
      { key: "EXP", color: "lightgreen", accessor: (d) => d.exp, label: "EXP" },
      {
        key: "Amount-Spawned",
        color: "purple", // Choose a color for the new line
        accessor: (d) => d.enemyAmountSpawned,
        label: "Enemy Amount Spawned",
      },
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
        svg.selectAll(".Score-line").attr("d", (d) =>
          d3
            .line()
            .x((d) => newX(d.time) + margin.left)
            .y((d) => newY(d.score) + margin.top)(d)
        );

        svg.selectAll(".Soul-Point-line").attr("d", (d) =>
          d3
            .line()
            .x((d) => newX(d.time) + margin.left)
            .y((d) => newY(d.gold) + margin.top)(d)
        );

        svg.selectAll(".EXP-line").attr("d", (d) =>
          d3
            .line()
            .x((d) => newX(d.time) + margin.left)
            .y((d) => newY(d.exp) + margin.top)(d)
        );

        svg.selectAll(".Amount-Spawned-line").attr("d", (d) =>
          d3
            .line()
            .x((d) => newX(d.time) + margin.left)
            .y((d) => newY(d.enemyAmountSpawned) + margin.top)(d)
        );

        // Recalculate the positions of points (circles) for each category
        svg
          .selectAll(".Score-point")
          .attr("cx", (d) => newX(d.time) + margin.left)
          .attr("cy", (d) => newY(d.score) + margin.top);

        svg
          .selectAll(".Soul-Point-point")
          .attr("cx", (d) => newX(d.time) + margin.left)
          .attr("cy", (d) => newY(d.gold) + margin.top);

        svg
          .selectAll(".EXP-point")
          .attr("cx", (d) => newX(d.time) + margin.left)
          .attr("cy", (d) => newY(d.exp) + margin.top);

        svg
          .selectAll(".Amount-Spawned-point")
          .attr("cx", (d) => newX(d.time) + margin.left)
          .attr("cy", (d) => newY(d.enemyAmountSpawned) + margin.top);

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

    /* Set up the toggle functionality
    const toggleChartButton = document.createElement("button");
    toggleChartButton.textContent = "Toggle Increment Chart";
    toggleChartButton.className = "toggle-btn";
    document.body.appendChild(toggleChartButton);

    
    toggleChartButton.addEventListener("click", () => {
      const chart = d3.select(".chart");
      const chartIncrement = d3.select(".chart-increment");

      const currentDisplay = chart.style("display");
      const newDisplay = currentDisplay === "none" ? "block" : "none";

      // Toggle between the two charts
      chart.style("display", newDisplay);
      chartIncrement.style("display", newDisplay === "none" ? "block" : "none");
    });
    */
  })
  .catch((error) => console.error("Error loading JSON:", error));
