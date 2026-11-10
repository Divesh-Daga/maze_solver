const ROWS = 20;
const COLS = 32;
const DEFAULT_START = { row: 10, col: 5 };
const DEFAULT_END = { row: 10, col: 26 };

const gridElement = document.getElementById("grid");
const algorithmSelect = document.getElementById("algorithmSelect");
const algorithmInfo = document.getElementById("algorithmInfo");
const algorithmBadge = document.getElementById("algorithmBadge");
const algorithmValue = document.getElementById("algorithmValue");
const statusText = document.getElementById("statusText");
const visitedCount = document.getElementById("visitedCount");
const pathCount = document.getElementById("pathCount");
const costValue = document.getElementById("costValue");
const timeValue = document.getElementById("timeValue");
const message = document.getElementById("message");
const speedSlider = document.getElementById("speedSlider");
const speedValue = document.getElementById("speedValue");

const algorithmDescriptions = {
  bfs: {
    name: "BFS",
    text: "Explores level by level. It guarantees the shortest path when every move has equal cost."
  },
  dijkstra: {
    name: "Dijkstra",
    text: "Always expands the cell with the lowest known travel cost. It handles weighted cells."
  },
  astar: {
    name: "A*",
    text: "Combines travel cost with a heuristic estimate to focus the search toward the destination."
  }
};

let cells = [];
let start = { ...DEFAULT_START };
let end = { ...DEFAULT_END };
let drawMode = "wall";
let mouseDown = false;
let running = false;
let runToken = 0;

function key(row, col) {
  return `${row},${col}`;
}

function createCell(row, col) {
  return {
    row,
    col,
    wall: false,
    weight: 1,
    visited: false,
    path: false,
    parent: null,
    distance: Infinity
  };
}

function buildGrid() {
  cells = Array.from({ length: ROWS }, (_, row) =>
    Array.from({ length: COLS }, (_, col) => createCell(row, col))
  );

  gridElement.innerHTML = "";

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const element = document.createElement("div");
      element.className = "cell";
      element.dataset.row = row;
      element.dataset.col = col;

      element.addEventListener("pointerdown", (event) => {
        if (running) return;
        mouseDown = true;
        event.currentTarget.setPointerCapture(event.pointerId);
        applyTool(row, col);
      });

      element.addEventListener("pointerenter", () => {
        if (!running && mouseDown) {
          applyTool(row, col);
        }
      });

      gridElement.appendChild(element);
    }
  }

  render();
}

function getElement(row, col) {
  return gridElement.children[row * COLS + col];
}

function render() {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const cell = cells[row][col];
      const element = getElement(row, col);

      element.className = "cell";

      if (cell.wall) element.classList.add("wall");
      if (cell.weight > 1 && !cell.wall) {
        element.classList.add("weight");
        element.dataset.weight = cell.weight;
      } else {
        delete element.dataset.weight;
      }

      if (cell.visited) element.classList.add("visited");
      if (cell.path) element.classList.add("path");

      if (row === start.row && col === start.col) {
        element.classList.add("start");
      }

      if (row === end.row && col === end.col) {
        element.classList.add("end");
      }
    }
  }
}

function clearSearchState() {
  for (const row of cells) {
    for (const cell of row) {
      cell.visited = false;
      cell.path = false;
      cell.parent = null;
      cell.distance = Infinity;
    }
  }

  visitedCount.textContent = "0";
  pathCount.textContent = "0";
  costValue.textContent = "—";
  timeValue.textContent = "—";
}

function clearBoard() {
  runToken++;
  running = false;

  for (const row of cells) {
    for (const cell of row) {
      cell.wall = false;
      cell.weight = 1;
    }
  }

  clearSearchState();
  statusText.textContent = "Ready";
  message.textContent = "Draw walls and choose an algorithm.";
  render();
}

function resetBoard() {
  clearBoard();
  start = { ...DEFAULT_START };
  end = { ...DEFAULT_END };
  message.textContent = "Board reset.";
  render();
}

function applyTool(row, col) {
  if ((row === start.row && col === start.col) ||
      (row === end.row && col === end.col)) {
    return;
  }

  const cell = cells[row][col];

  if (drawMode === "wall") {
    cell.wall = !cell.wall;
    if (cell.wall) cell.weight = 1;
  } else if (drawMode === "weight") {
    cell.wall = false;
    cell.weight = cell.weight === 1 ? 5 : cell.weight === 5 ? 10 : 1;
  } else {
    cell.wall = false;
    cell.weight = 1;
  }

  clearSearchState();
  statusText.textContent = "Ready";
  render();
}

function neighbors(cell) {
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1]
  ];

  const result = [];

  for (const [dr, dc] of dirs) {
    const row = cell.row + dr;
    const col = cell.col + dc;

    if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
      result.push(cells[row][col]);
    }
  }

  return result;
}

function delay() {
  const speed = Number(speedSlider.value);
  return Math.max(5, 105 - speed);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function heuristic(a, b) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

function prepareSearch() {
  clearSearchState();

  const started = performance.now();

  for (const row of cells) {
    for (const cell of row) {
      if (!cell.wall) {
        cell.distance = Infinity;
      }
    }
  }

  cells[start.row][start.col].distance = 0;

  return started;
}

async function bfs(token) {
  const queue = [cells[start.row][start.col]];
  const discovered = new Set([key(start.row, start.col)]);
  const visited = [];

  while (queue.length && token === runToken) {
    const current = queue.shift();

    if (!(current.row === start.row && current.col === start.col)) {
      current.visited = true;
      visited.push(current);
      render();
      await sleep(delay());
    }

    if (current.row === end.row && current.col === end.col) {
      return { visited, found: true };
    }

    for (const next of neighbors(current)) {
      if (next.wall || discovered.has(key(next.row, next.col))) continue;

      discovered.add(key(next.row, next.col));
      next.parent = current;
      queue.push(next);
    }
  }

  return { visited, found: false };
}

async function dijkstra(token) {
  const queue = [cells[start.row][start.col]];
  const visited = [];
  const processed = new Set();

  while (queue.length && token === runToken) {
    queue.sort((a, b) => a.distance - b.distance);
    const current = queue.shift();

    if (processed.has(key(current.row, current.col))) continue;
    processed.add(key(current.row, current.col));

    if (!(current.row === start.row && current.col === start.col)) {
      current.visited = true;
      visited.push(current);
      render();
      await sleep(delay());
    }

    if (current.row === end.row && current.col === end.col) {
      return { visited, found: true };
    }

    for (const next of neighbors(current)) {
      if (next.wall || processed.has(key(next.row, next.col))) continue;

      const newDistance = current.distance + next.weight;

      if (newDistance < next.distance) {
        next.distance = newDistance;
        next.parent = current;
        queue.push(next);
      }
    }
  }

  return { visited, found: false };
}

async function astar(token) {
  const open = [cells[start.row][start.col]];
  const visited = [];
  const closed = new Set();

  cells[start.row][start.col].distance = 0;

  while (open.length && token === runToken) {
    open.sort((a, b) => {
      const scoreA = a.distance + heuristic(a, cells[end.row][end.col]);
      const scoreB = b.distance + heuristic(b, cells[end.row][end.col]);

      return scoreA - scoreB;
    });

    const current = open.shift();
    const currentKey = key(current.row, current.col);

    if (closed.has(currentKey)) continue;
    closed.add(currentKey);

    if (!(current.row === start.row && current.col === start.col)) {
      current.visited = true;
      visited.push(current);
      render();
      await sleep(delay());
    }

    if (current.row === end.row && current.col === end.col) {
      return { visited, found: true };
    }

    for (const next of neighbors(current)) {
      if (next.wall || closed.has(key(next.row, next.col))) continue;

      const newDistance = current.distance + next.weight;

      if (newDistance < next.distance) {
        next.distance = newDistance;
        next.parent = current;
        open.push(next);
      }
    }
  }

  return { visited, found: false };
}

async function animatePath(token) {
  const finalPath = [];
  let current = cells[end.row][end.col];

  while (current && token === runToken) {
    finalPath.push(current);
    current = current.parent;
  }

  finalPath.reverse();

  if (!finalPath.length || finalPath[0] !== cells[start.row][start.col]) {
    return { path: [], cost: null };
  }

  let totalCost = 0;

  for (const cell of finalPath) {
    if (cell !== cells[start.row][start.col]) {
      totalCost += cell.weight;
    }

    if (cell !== cells[start.row][start.col] &&
        cell !== cells[end.row][end.col]) {
      cell.path = true;
      pathCount.textContent = String(
        Number(pathCount.textContent) + 1
      );
      render();
      await sleep(Math.max(12, delay() * 1.3));
    }
  }

  return { path: finalPath, cost: totalCost };
}

async function visualize() {
  if (running) return;

  running = true;
  runToken++;
  const token = runToken;

  startControls(true);
  statusText.textContent = "Running";
  message.textContent = "Searching for a path...";
  const started = prepareSearch();
  render();

  const algorithm = algorithmSelect.value;

  let result;

  if (algorithm === "bfs") {
    result = await bfs(token);
  } else if (algorithm === "dijkstra") {
    result = await dijkstra(token);
  } else {
    result = await astar(token);
  }

  if (token !== runToken) return;

  visitedCount.textContent = String(result.visited.length);

  if (result.found) {
    const resultPath = await animatePath(token);

    if (token !== runToken) return;

    pathCount.textContent = String(
      Math.max(0, resultPath.path.length - 2)
    );

    costValue.textContent =
      resultPath.cost === null ? "—" : String(resultPath.cost);

    message.textContent = "Shortest path found.";
    statusText.textContent = "Complete";
  } else {
    message.textContent = "No path exists between the two points.";
    statusText.textContent = "No path";
  }

  timeValue.textContent = `${Math.round(performance.now() - started)} ms`;
  running = false;
  startControls(false);
}

function generateMaze() {
  if (running) return;

  runToken++;
  clearSearchState();

  for (const row of cells) {
    for (const cell of row) {
      cell.wall = Math.random() < 0.28;
      cell.weight = 1;
    }
  }

  cells[start.row][start.col].wall = false;
  cells[end.row][end.col].wall = false;

  statusText.textContent = "Ready";
  message.textContent = "Random maze generated.";
  render();
}

function startControls(disabled) {
  document.querySelectorAll("button, select, input").forEach(control => {
    control.disabled = disabled;
  });
}

function updateAlgorithmUI() {
  const algorithm = algorithmSelect.value;
  const info = algorithmDescriptions[algorithm];

  algorithmInfo.innerHTML = `<strong>${info.name}</strong><p>${info.text}</p>`;
  algorithmBadge.textContent = info.name;
  algorithmValue.textContent = info.name;
}

document.querySelectorAll(".tool").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tool").forEach(item => {
      item.classList.remove("active");
    });

    button.classList.add("active");
    drawMode = button.dataset.mode;
  });
});

document.getElementById("startBtn").addEventListener("click", visualize);
document.getElementById("mazeBtn").addEventListener("click", generateMaze);
document.getElementById("clearBtn").addEventListener("click", clearBoard);
document.getElementById("resetBtn").addEventListener("click", resetBoard);

algorithmSelect.addEventListener("change", () => {
  updateAlgorithmUI();
  clearSearchState();
  render();
});

speedSlider.addEventListener("input", () => {
  speedValue.textContent = `${speedSlider.value}%`;
});

document.addEventListener("pointerup", () => {
  mouseDown = false;
});

buildGrid();
updateAlgorithmUI();
