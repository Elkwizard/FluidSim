class Particle {
	constructor(x, y) {
		this.x = x;
		this.y = y;
		this.vx = 0;
		this.vy = 0;
		// this.color = `rgb(${Math.random() * 255}, 128, ${Math.random() * 255})`;
		this.color = `rgb(${Math.random() * 200}, ${Math.random() * 200}, 255)`;
	}
	integrate() {
		this.x += this.vx;
		this.y += this.vy;
		this.vx *= 0.995;
		this.vy *= 0.995;
		this.vy += 0.4;
	}
	solve(particles, RADIUS, RADIUS_TERM, e, VISCOSITY) {
		for (let i = 0; i < particles.length; i++) {
			let p = particles[i];
			if (this !== p) {
				let dx = p.x - this.x;
				let dy = p.y - this.y;
				let mag = dx ** 2 + dy ** 2;
				if (mag < RADIUS_TERM && mag) {
					mag = Math.sqrt(mag);
					let over = (RADIUS + RADIUS - mag) / 2;
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


				}
			}
		}
	}
	wallResolve(MIN_BOUND_X, MIN_BOUND_Y, MAX_BOUND_X, MAX_BOUND_Y, RADIUS, e, VISCOSITY) {
		const BOUND_X = MAX_BOUND_X - MIN_BOUND_X;
		const BOUND_Y = MAX_BOUND_Y - MIN_BOUND_Y;
		if (this.x < MIN_BOUND_X + RADIUS) {
			this.vx *= -e;
			this.vy *= (1 - VISCOSITY);
			this.x = MIN_BOUND_X + RADIUS;
		}
		if (this.y < MIN_BOUND_Y + RADIUS) {
			this.vy *= -e;
			this.vx *= (1 - VISCOSITY);
			this.y = MIN_BOUND_Y + RADIUS;
		}
		if (this.x > MAX_BOUND_X - RADIUS) {
			this.vx *= -e;
			this.vy *= (1 - VISCOSITY);
			this.x = MAX_BOUND_X - RADIUS;
		}
		if (this.y > MAX_BOUND_Y - RADIUS) {
			this.vy *= -e;
			this.vx *= (1 - VISCOSITY);
			this.y = MAX_BOUND_Y - RADIUS;
		}
		// let mx = MIN_BOUND_X + BOUND_X / 2;
		// let my = MIN_BOUND_Y + BOUND_Y / 2;
		// let dx = this.x - mx;
		// let dy = this.y - my;
		// let r = 200 + RADIUS;
		// if (dx ** 2 + dy ** 2 < r ** 2) {
		// 	let m = Math.sqrt(dx ** 2 + dy ** 2);
		// 	let over = r - m;
		// 	dx *= over / m;
		// 	dy *= over / m;
		// 	this.x += dx;
		// 	this.y += dy;
		// 	over *= 20;
		// 	dx /= over;
		// 	dy /= over;
		// 	this.force(dx, dy);
		// }
		// if (this.x < this.y) {
		// 	this.x = this.y;
		// 	this.vx *= -e;
		// 	this.vy *= -e;
		// }
	}
	move(dx, dy) {
		this.x += dx;
		this.y += dy;
	}
	force(vx, vy) {
		this.vx += vx;
		this.vy += vy;
	}
	draw(c, RADIUS) {
		c.beginPath();
		// c.moveTo(this.x - RADIUS, this.y - RADIUS);
		// c.lineTo(this.x - RADIUS, this.y + RADIUS);
		// c.lineTo(this.x + RADIUS, this.y);
		c.arc(this.x, this.y, RADIUS, 0, 2 * Math.PI);
		c.fill();
	}
	static fluidSim(particles, MIN_BOUND_X, MIN_BOUND_Y, MAX_BOUND_X, MAX_BOUND_Y, RADIUS = 3, e = 0, VISCOSITY = 0) {
		const RADIUS_TERM = (RADIUS + RADIUS) ** 2;
		const BOUND_X = MAX_BOUND_X - MIN_BOUND_X;
		const BOUND_Y = MAX_BOUND_Y - MIN_BOUND_Y;

		const CELL_SIZE = RADIUS * 2;
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
				// particles[i].draw(c, RADIUS);
			}
			return drawGrid;
		}
		function update(solves = 1) {
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
			for (let n = 0; n < solves; n++) for (let i = 0; i < particles.length; i++) {
				let p = particles[i];
				particles[i].wallResolve(MIN_BOUND_X, MIN_BOUND_Y, MAX_BOUND_X, MAX_BOUND_Y, RADIUS, e, VISCOSITY);
				let { x, y } = getGrid(p);
				p.solve(particleGrid[x][y], RADIUS, RADIUS_TERM, e, VISCOSITY);
			}
			for (let i = 0; i < particles.length; i++) {
				particles[i].wallResolve(MIN_BOUND_X, MIN_BOUND_Y, MAX_BOUND_X, MAX_BOUND_Y, RADIUS, e, VISCOSITY);
			}
		}
		return { update, draw };
	}
}