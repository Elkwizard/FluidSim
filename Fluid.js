class Particle {
	constructor(x, y) {
		this.x = x;
		this.y = y;
		this.vx = 0;
		this.vy = 0;
		this.r = null
		// this.color = `rgb(${Math.random() * 255}, 128, ${Math.random() * 255})`;
		// this.color = `rgb(${Math.random() * 200}, ${Math.random() * 200}, 255)`;
		this.color = `rgb(255, ${Math.random() * 128}, 0)`;
		// this.color = `rgb(0, 128, ${Math.random() * 128})`;
		// this.color = "blue";
		// this.color = `rgb(${Math.random() * 70 + 128}, ${Math.random() * 70 + 128}, ${Math.random() * 70 + 128})`;
	}
	integrate() {
		this.x += this.vx;
		this.y += this.vy;
		this.vx *= 0.995;
		this.vy *= 0.995;
		this.vy += 0.4;
	}
	solve(particles, e, VISCOSITY) {
		let solves = 0;
		for (let i = 0; i < particles.length; i++) {
			let p = particles[i];
			if (this !== p) {
				let dx = p.x - this.x;
				let dy = p.y - this.y;
				let mag = dx ** 2 + dy ** 2;
				if (mag < (this.r + p.r) ** 2 && mag) {
					mag = Math.sqrt(mag);
					let over = (this.r + p.r - mag) / 2 + 0;
					dx /= mag;
					dy /= mag;
					let mx = dx * over;
					let my = dy * over;
					p.move(mx, my);
					this.move(-mx, -my);

					let j = (1 + e) * ((this.vx - p.vx) * dx + (this.vy - p.vy) * dy) / 2;
					p.force(dx * j, dy * j);
					this.force(-dx * j, -dy * j);

					let jt = (1 + e) * ((this.vx - p.vx) * -dy + (this.vy - p.vy) * dx) / 2 * VISCOSITY;
					p.force(-dy * jt, dx * jt);
					this.force(dy * jt, -dx * jt);

					solves++;
				}
			}
		}
		return solves;
	}
	wallResolve(MIN_BOUND_X, MIN_BOUND_Y, MAX_BOUND_X, MAX_BOUND_Y, polys, e, VISCOSITY) {

		if (this.x < MIN_BOUND_X + this.r) {
			this.vx *= -e;
			this.vy *= (1 - VISCOSITY);
			this.x = MIN_BOUND_X + this.r;
		}
		if (this.y < MIN_BOUND_Y + this.r) {
			this.vy *= -e;
			this.vx *= (1 - VISCOSITY);
			this.y = MIN_BOUND_Y + this.r;
		}
		if (this.x > MAX_BOUND_X - this.r) {
			this.vx *= -e;
			this.vy *= (1 - VISCOSITY);
			this.x = MAX_BOUND_X - this.r;
		}
		if (this.y > MAX_BOUND_Y - this.r) {
			this.vy *= -e;
			this.vx *= (1 - VISCOSITY);
			this.y = MAX_BOUND_Y - this.r;
		}

		for (let i = 0; i < polys.length; i++) {
			let b = polys[i].vertices;
			let box = polys[i].boundingBox;
			if (this.x + this.r < box.x || this.x - this.r > box.x + box.width || this.y + this.r < box.y || this.y - this.r > box.y + box.height) continue;
			let middle = { x: 0, y: 0 };
			for (let j = 0; j < b.length; j++) {
				middle.x += b[j].x;
				middle.y += b[j].y;
			}
			middle.x /= b.length;
			middle.y /= b.length;
			let bestDist = Infinity;
			let bestPoint = null;
			let ax = this.x;
			let ay = this.y;
			for (let i = 0; i < b.length; i++) {
				let start = b[i];
				let end = b[(i + 1) % b.length];

				let submission;
				if (Math.abs(end.x - start.x) < 0.00001) {
					let min_ = Math.min(start.y, end.y);
					let max_ = Math.max(start.y, end.y);
					submission = { x: start.x, y: ay };
					if (ay < min_) submission.y = min_;
					if (ay > max_) submission.y = max_;
				} else if (Math.abs(end.y - start.y) < 0.00001) {
					let min_ = Math.min(start.x, end.x);
					let max_ = Math.max(start.x, end.x);
					submission = { x: ax, y: start.y };
					if (ax < min_) submission.x = min_;
					if (ax > max_) submission.x = max_;
				} else {
					let dx = end.x - start.x;
					let dy = end.y - start.y;
					let n_x = -dy;
					let n_y = dx;
					let m = n_y / n_x;
					let b = ay - m * ax;
					let m_n = dy / dx;
					let b_n = start.y - start.x * m_n;
					//m_n * x + b_n = m * x + b
					//(m_n - m) * x = b - b_n
					//x = (b - b_n) / (m_n - m)
					let x = (b - b_n) / (m_n - m);
					let min_ = Math.min(start.x, end.x);
					let max_ = Math.max(start.x, end.x);
					if (x < min_) x = min_;
					if (x > max_) x = max_;
					let y = m_n * x + b_n;
					submission = { x, y };
				}
				let dist = (submission.x - ax) ** 2 + (submission.y - ay) ** 2;
				if (dist < bestDist) {
					bestDist = dist;
					bestPoint = submission;
				}
			}
			if (bestPoint) {

				let between = { x: bestPoint.x - this.x, y: bestPoint.y - this.y };
				bestDist = Math.sqrt(bestDist);
				let betweenMag = Math.sqrt(between.x ** 2 + between.y ** 2);
				let axis = { x: between.x / betweenMag, y: between.y / betweenMag };

				let toB = { x: this.x - middle.x, y: this.y - middle.y };
				let inside = toB.x * axis.x + toB.y * axis.y > 0;

				if (bestDist > this.r && !inside) continue;

				if (inside) {
					axis = { x: -axis.x, y: -axis.y };
					bestDist = bestDist + this.r;
				} else bestDist = this.r - bestDist;

				if (!bestDist) continue;

				//axis, bestDist
				bestDist += 0.01;
				this.x -= axis.x * bestDist;
				this.y -= axis.y * bestDist;
				let j = -(1 + e) * (this.vx * axis.x + this.vy * axis.y);
				this.vx += axis.x * j;
				this.vy += axis.y * j;
			}

		}
		if (this.x < MIN_BOUND_X + this.r) {
			this.vx *= -e;
			this.vy *= (1 - VISCOSITY);
			this.x = MIN_BOUND_X + this.r;
		}
		if (this.y < MIN_BOUND_Y + this.r) {
			this.vy *= -e;
			this.vx *= (1 - VISCOSITY);
			this.y = MIN_BOUND_Y + this.r;
		}
		if (this.x > MAX_BOUND_X - this.r) {
			this.vx *= -e;
			this.vy *= (1 - VISCOSITY);
			this.x = MAX_BOUND_X - this.r;
		}
		if (this.y > MAX_BOUND_Y - this.r) {
			this.vy *= -e;
			this.vx *= (1 - VISCOSITY);
			this.y = MAX_BOUND_Y - this.r;
		}
	}
	move(dx, dy) {
		this.x += dx;
		this.y += dy;
	}
	force(vx, vy) {
		this.vx += vx;
		this.vy += vy;
	}
	draw(c) {
		let w = this.r * 3;
		c.fillRect(this.x - w / 2, this.y - w / 2, w, w);
		// c.beginPath();
		// c.arc(this.x, this.y, w / 2, 0, 2 * Math.PI);
		// c.fill();
	}
	static fluidSim(particles, MIN_BOUND_X, MIN_BOUND_Y, MAX_BOUND_X, MAX_BOUND_Y, polysRaw = [], RADIUS = 3, e = 0, VISCOSITY = 0) {
		const BOUND_X = MAX_BOUND_X - MIN_BOUND_X;
		const BOUND_Y = MAX_BOUND_Y - MIN_BOUND_Y;
		let polys;
		function processPolygons(p) {
			polys = p.map(vert => {
				let minX = Infinity;
				let minY = Infinity;
				let maxX = -Infinity;
				let maxY = -Infinity;
				for (let i = 0; i < vert.length; i++) {
					let v = vert[i];
					if (v.x < minX) minX = v.x;
					if (v.x > maxX) maxX = v.x;
					if (v.y < minY) minY = v.y;
					if (v.y > maxY) maxY = v.y;
				}
				return {
					vertices: vert,
					boundingBox: { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
				};
			});
		}
		processPolygons(polysRaw);
		const MAX_RADIUS = RADIUS + 0.5 * RADIUS;
		const CELL_SIZE = MAX_RADIUS * 2;
		const GRID_WIDTH = Math.ceil(BOUND_X / CELL_SIZE);
		const GRID_HEIGHT = Math.ceil(BOUND_Y / CELL_SIZE);
		let grid = [];
		for (let i = 0; i < GRID_WIDTH; i++) {
			grid.push([]);
			for (let j = 0; j < GRID_HEIGHT; j++) grid[i].push([]);
		}

		function getGrid(p) {
			let x = Math.floor((p.x - MIN_BOUND_X) / CELL_SIZE);
			let y = Math.floor((p.y - MIN_BOUND_Y) / CELL_SIZE);
			return { x, y };
		}

		function draw(c) {
			let drawGrid = grid.map(col => col.map(cell => false));
			for (let i = 0; i < particles.length; i++) {
				let { x, y } = getGrid(particles[i]);
				drawGrid[x][y] = true;
				c.fillStyle = particles[i].color;
				particles[i].draw(c);
			}
			return drawGrid;
		}
		function update(solves = 1) {
			for (let i = 0; i < particles.length; i++) {
				let p = particles[i];
				if (!p.r) p.r = RADIUS + (Math.random() - 0.5) * RADIUS;
			}
			//move
			for (let i = 0; i < particles.length; i++) {
				let p = particles[i];
				p.integrate();
			}

			//put in grid
			let particleGrid = grid.map(col => col.map(cell => []));
			for (let n = 0; n < particles.length; n++) {
				let p = particles[n];
				let { x, y } = getGrid(p);
				for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
					let X = x + i;
					let Y = y + j;
					if (X >= 0 && X < GRID_WIDTH && Y >= 0 && Y < GRID_HEIGHT) {
						particleGrid[X][Y].push(p);
					}
				}
			}


			//solve
			let collisions = 0;
			for (let n = 0; n < solves; n++) for (let i = 0; i < particles.length; i++) {
				let p = particles[i];
				particles[i].wallResolve(MIN_BOUND_X, MIN_BOUND_Y, MAX_BOUND_X, MAX_BOUND_Y, polys, e, VISCOSITY);
				let { x, y } = getGrid(p);
				collisions += p.solve(particleGrid[x][y], e, VISCOSITY);
			}
			for (let i = 0; i < particles.length; i++) {
				particles[i].wallResolve(MIN_BOUND_X, MIN_BOUND_Y, MAX_BOUND_X, MAX_BOUND_Y, polys, e, VISCOSITY);
			}
			return collisions;
		}
		return { update, draw, processPolygons };
	}
}