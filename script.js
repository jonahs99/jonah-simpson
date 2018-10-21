window.onload = run

const WIDTH = 1600
const HEIGHT = 200

const NAME = 'jonah simpson'
const font = '180px "Nunito Bold"'

let context
let poisson_pts
let discs = []

function run() {
    let canvas = document.createElement('canvas')
    canvas.width = WIDTH
    canvas.height = HEIGHT
    
    document.getElementById('cv-container').appendChild(canvas)

    context = canvas.getContext('2d')

    document.fonts.load(font).then((f) => {
        let region = create_region()
        poisson_pts =  poisson([0, 0, WIDTH, HEIGHT], 11, 40, region)
        requestAnimationFrame(render)
    })

    // Fade in the nav links
    document.getElementById('nav').style.opacity = 1
}

function create_region() {
    // Make a copy canvas
    let cv = document.createElement('canvas')
    cv.width = context.canvas.width
    cv.height = context.canvas.height
    let ctx = cv.getContext('2d')
    
    ctx.font = font
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillStyle = '#fff'
    ctx.fillText(NAME, WIDTH/2, HEIGHT-20)

    pixel_data = ctx.getImageData(0, 0, WIDTH, HEIGHT).data

    const in_region = (pt) => {
        let i = (Math.round(pt[1]) * WIDTH + Math.round(pt[0])) * 4
        return pixel_data[i] == 255
    }

    return (pt) => {
        let r = 3
        let t = rand_range(0, Math.PI * 2)
        for (let i = 0; i < 3; i++) {
            t += Math.PI * 2 / 3
            if (!in_region([pt[0] + Math.cos(t) * r, pt[1] + Math.sin(t) * r])) return false
        }
        return true
    }
}

function render() {
    requestAnimationFrame(render)

    for (let i = discs.length - 1; i >= 0; i--) {
        let d = discs[i]
        d[2] += d[3]
        d[3] += 0.2 * (d[4] - d[2])
        d[3] *= 0.6
    }

    for (let pt of consume(poisson_pts, rand_int(1, 4))) {
        let r = rand_range(3, 3.5)
        discs.push([pt[0], pt[1], 0, 0, r, rand_int(20, 60)])
    }

    context.clearRect(0, 0, WIDTH, HEIGHT)

    for (let d of discs) {
        context.fillStyle = `rgba(${d[5]},${d[5]},${d[5]},1)`
        context.beginPath()
        context.arc(d[0], d[1], d[2], 0, Math.PI * 2)
        context.fill()
    }
}

function rand_range(min, max) {
    return min + Math.random() * (max - min)
}

function rand_int(min, max) {
    return Math.floor(rand_range(min, max));
}

function rand_sign() {
    return Math.random() < 0.5 ? -1 : 1
}

function rand_point(center, min_rad, max_rad) {
    const r = rand_range(min_rad, max_rad)
    const t = rand_range(0, Math.PI * 2)
    return [center[0] + r * Math.cos(t), center[1] + r * Math.sin(t)]
}

function dist(p1, p2) {
    return Math.sqrt(Math.pow(p1[0]-p2[0], 2) + Math.pow(p1[1] - p2[1], 2))
}

function in_bounds(pt, bounds) {
    return pt[0] >= bounds[0] && pt[0] < bounds[2] &&
           pt[1] >= bounds[1] && pt[1] < bounds[3]
}

function consume(gen, n) {
    let out = []

    for (let i = 0; i < n; i++) {
        let nxt = gen.next()
        if (nxt.done) return out
        out.push(nxt.value)
    }
    
    return out
}

function* poisson(bounds, r, k=30, region=(pt)=>true) {
    const w = bounds[2] - bounds[0]
    const h = bounds[3] - bounds[1]

    const grid_size = r / Math.sqrt(2)
    const grid_cols = Math.ceil(w/grid_size)
    const grid_rows = Math.ceil(h/grid_size)

    const offsets = []
    for (let i = -2; i <= 2; i++) {
        for (let j = -2; j<= 2; j++) {
            offsets.push(i + grid_cols*j)
        }
    }

    let pts = []
    let active = []
    let grid = Array(grid_cols * grid_rows).fill(-1)

    let seed_x = 0

    const grid_index = (p) => (Math.floor(p[0]/grid_size) + Math.floor(p[1]/grid_size)*grid_cols)

    const reject = (pt) => {
        if (!in_bounds(pt, bounds)) return true
        if (!region(pt)) return true

        let pt_grid = grid_index(pt)

        for (let off of offsets) {
            if (pt_grid + off < 0 || pt_grid + off >= grid.length) continue
            if (grid[pt_grid + off] == -1) continue
            if (dist(pt, pts[grid[pt_grid + off]]) < r) return true
        }

        return false
    }

    const try_point = (pt) => {
        if (reject(pt)) return false
        grid[grid_index(pt)] = pts.length
        pts.push(pt)
        active.push(pt)
        return true
    }

    // The seed strategy is left to right
    while (!active.length) {
        for (let j = 0; j < k; j++) {
            let pt = [WIDTH*0.4 + seed_x * rand_sign(), rand_range(0, h)]
            if (try_point(pt)) {
                yield pt
            }
        }
        seed_x += 10
    }

    while (active.length > 0) {
        const i = rand_int(0, active.length)
        
        let found = false
        for (let j = 0; j < k; j++) {
            let pt = rand_point(active[i], r, 2 * r)

            if (try_point(pt)) {
                yield pt
                found = true
                break
            }
        }

        if (!found) {
            active.splice(i, 1)
        }

        // Try reseeding in case we are in an island
        if (active.length == 0) {
            while (active.length == 0 && seed_x < WIDTH) {
                for (let j = 0; j < k; j++) {
                    let pt = [WIDTH*0.4 + seed_x * rand_sign(), rand_range(0, h)]
                    if (try_point(pt)) {
                        yield pt
                    }
                }
                seed_x += 10
            }
        }
    }

    return
}