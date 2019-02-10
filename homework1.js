function accum(a, b, bscale) {
    a.x += b.x * bscale;
    a.y += b.y * bscale;
    a.z += b.z * bscale;
}

class StateVector {
    constructor() {
        this.x = Vector3.make();
        this.v = Vector3.make();
        this.a = Vector3.make();
        this.m = 1.0;
    }
}

class Simulation {
    constructor() {
        this.objects = [];
    }

    reset() {
        this.objects = [];
        for (let i = 0; i < 6; i++) {
            let sv = new StateVector();
            sv.x.x = i - 2;
            sv.x.y = -1;
            sv.v.y = 5;
            sv.a.y = -9.8;
            this.objects.push(sv);
        }
    }

    update(dt) {
		for (let i = 0;i < this.objects.length; i++) {
			let sv = this.objects[i];
			for (let j = i+1;j < this.objects.length; j++){			
				let obj = this.objects[j];
				let dx = sv.x.x - obj.x.x;
				let dy = sv.x.y - obj.x.y;
				let distance = Math.sqrt(dx * dx + dy * dy);

				if (distance < .2) {
					let nx = (obj.x.x - sv.x.x)/2
					let ny = (obj.x.y - sv.x.y)/2
					let p = 2 *(sv.v.x * nx + sv.v.y * ny - obj.v.x * nx - obj.v.y * ny)/(sv.x.m+obj.x.m);
					let vx1 = sv.v.x - p * sv.x.m *nx;
					let vy1 = sv.v.y - p * sv.x.m *ny;
					let vx2 = obj.v.x + p * obj.x.m *nx;
					let vy2 = obj.v.y + p * obj.x.m *ny;
					sv.v = Vector3.make(vx1,vy1,0.0);
					obj.v =  Vector3.make(vx2,vy2,0.0);
				}
				
			}
            // update Forces
            // a = F/m
            // F_air = dv
            // F_wind = d v_wind
            // F = F_gravity + F_air + F_wind
            // a = g - (d/m)(v_wind - v)

            sv.a = Vector3.make(0.0, -9.8, 0.0)

            // Integrate using 1/2(v0 + v1)
            let v_before = sv.v.clone();
            accum(sv.v, sv.a, dt);
            let v_after = sv.v.clone();
            let v = (v_after.add(v_before)).scale(0.5);
            accum(sv.x, v, dt);

            if (sv.x.y < -2) {
                sv.x.y = 2;
            } else if (sv.x.y > 2){
				sv.x.y = -2;
			}

            if (sv.x.x < -2.79) {
                sv.x.x = 2.79;
            } else if (sv.x.x > 2.79) {
                sv.x.x = -2.79;
            }
        }
    }
}

class App {
    constructor() {
        this.xor = new LibXOR("project");
        this.sim = new Simulation();

        let p = document.getElementById('desc');
        p.innerHTML = `This physics demonstration of bouncing blocks demonstrates
        applying the force of gravity with a random starting up velocity. When the
        block hits the bottom, a new up velocity is applied and the block is not
        allowed to descend below the floor. Additionally, we apply the force of
        wind and air resistance.`;
    }

    init() {
        hflog.logElement = "log";
        this.xor.graphics.setVideoMode(1.5 * 384, 384);
        this.xor.input.init();
        let gl = this.xor.graphics.gl;

        let rc = this.xor.renderconfigs.load('default', 'basic.vert', 'basic.frag');
        rc.useDepthTest = false;

        let pal = this.xor.palette;

        let rect = this.xor.meshes.load('sphere', 'circle.obj');
        let bg = this.xor.meshes.create('bg');
        bg.color3(pal.getColor(pal.BLACK));
        bg.rect(-3, -3, -2.9, 3);
		bg.color3(pal.getColor(pal.BLACK));
        bg.rect(3, -3, 2.9, 3);
        bg.color3(pal.getColor(pal.YELLOW));
        bg.circle(2, 1.5, 0.25);
        this.sim.reset();
    }

    start() {
        this.mainloop();
    }

    update(dt) {
        let xor = this.xor;
        let resetSim = false;
        if (xor.input.checkKeys([" ", "Space"])) {
            resetSim = true;
        }

        if (resetSim) {
            this.sim.reset();
        }

        this.sim.update(dt);
    }

    render() {
        let xor = this.xor;
        xor.graphics.clear(xor.palette.AZURE);

        let pmatrix = Matrix4.makePerspectiveY(45.0, 1.5, 1.0, 100.0);
        let cmatrix = Matrix4.makeOrbit(-90, 0, 5.0);
        let rc = xor.renderconfigs.use('default');
        if (rc) {
            rc.uniformMatrix4f('ProjectionMatrix', pmatrix);
            rc.uniformMatrix4f('CameraMatrix', cmatrix);

            rc.uniformMatrix4f('WorldMatrix', Matrix4.makeIdentity());
            xor.meshes.render('bg', rc);

            for (let sv of this.sim.objects) {
                rc.uniformMatrix4f('WorldMatrix', Matrix4.makeTranslation3(sv.x));
                xor.meshes.render('sphere', rc);
            }
        }
        xor.renderconfigs.use(null);
    }

    mainloop() {
        let self = this;
        window.requestAnimationFrame((t) => {
            self.xor.startFrame(t);
            self.update(self.xor.dt);
            self.render();
            self.mainloop();
        });
    }
}

let app = new App();
app.init();
app.start();
