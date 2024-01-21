import Timer from './timer'
import ClockDrawing from './clockDrawing'
import('https://cdn.jsdelivr.net/npm/p5@1.0.0/lib/p5.min.js').then(
  ({ default: p5 }) => main(p5)).catch(err => {console.log(err)})

const COLORS = {
  peach: '#ffdebd',
  green: '#beffe8',
  dark: '#047f01',
  light: '#e9edd0',
}

const COLORS_DISABLED = {
  peach: '#ffdebd7f',
  green: '#beffe87f',
  dark: '#047f017f',
  light: '#e9edd07f',
}

const SOUNDS = {
  end: 'gong',
  rest: 'bell',
  work: 'alert',
}

const INITIAL_STATE = {
  active: false,
  elapsed: 0,
  round: 0,
  schedule: [
    {work: 7, rest: 4, duration: 20},
  ],
  lastUpdate: Date.now(),
}

const main = () => {
  const timerRoots = document.getElementsByClassName('timer')
  const initialState = INITIAL_STATE
  const timer = new Timer(initialState)
  const clockDrawing = new ClockDrawing(timer)
  const configForm = document.getElementById('config-form')
  const configFormInput = document.getElementById('config-input')
  configFormInput.value = JSON.stringify(initialState.schedule)
  configForm.addEventListener('submit', onConfigSubmit(timer))
  const timerP5s = Array.from(timerRoots).map(
    root => new p5(initTimerSketch(timer, clockDrawing), root))
}

const onConfigSubmit = (timer, sketch) => e => {
  e.preventDefault()
  const formData = new FormData(e.target)
  const config = JSON.parse(formData.get('config'))
  timer.setStateAttr('schedule', config)
}

const initTimerSketch = (timer, clockDrawing) => sketch => {
  const sounds = Object.fromEntries(Object.entries(SOUNDS).map(
    ([key, name]) => [key, sketch.select('#audio-' + name).elt]))
  let working = false  // let the initial start of work register
  let currentDrawingArea

  sketch.setup = () => {
    sketch.noFill()
    sketch.frameRate(1)
  }

  sketch.draw = () => {
    const prevActive = timer.active
    timer.updateElapsed()
    const active = timer.active
    const pallette = active ? COLORS : COLORS_DISABLED
    const size = getTimerSize(sketch)
    const strokeWeight = 5 * size.scale
    const clockMargin = strokeWeight
    const clockRadius = size.height / 2 - clockMargin
    const clockCenter = [size.width / 2, clockRadius + clockMargin]
    currentDrawingArea = [
      // x1, y1, x2, y2
      clockCenter[0] - clockRadius, clockCenter[1] - clockRadius,
      clockCenter[0] + clockRadius, clockCenter[1] + clockRadius
    ]
    const {
      handPosition, restArc, workArcs
    } = clockDrawing.getParams(clockRadius, clockCenter, strokeWeight)
    sketch.strokeWeight(strokeWeight)
    sketch.resizeCanvas(size.width, size.height)
    sketch.noStroke()
    sketch.fill(pallette.light)
    sketch.circle(...clockCenter, 2 * clockRadius)
    sketch.noFill()
    sketch.stroke(pallette.peach)  // rest
    sketch.arc(
      ...clockCenter, 2 * clockRadius, 2 * clockRadius, ...restArc)
    sketch.stroke(pallette.dark)  // work
    workArcs.forEach(arc => sketch.arc(
      ...clockCenter, 2 * clockRadius, 2 * clockRadius, ...arc))
    sketch.circle(...clockCenter, strokeWeight)
    sketch.line(...clockCenter, ...handPosition)

    const sessionSequenceRelative = timer.sessionSequenceRelative
    const latestPeriod = (
      sessionSequenceRelative[sessionSequenceRelative.length - 1])
    const prevWorking = working
    if(latestPeriod) {
      working = latestPeriod.working
    }
    if(!active && prevActive && timer.elapsedRelative === 1) {
      sounds.end.play()
    } else if(working && !prevWorking) {
      sounds.work.play()
    } else if(!working && prevWorking) {
      sounds.rest.play()
    }
  }

  sketch.mouseClicked = () => {
    if(currentDrawingArea === undefined) return
    const [x1, y1, x2, y2] = currentDrawingArea
    if(
      sketch.mouseX <= x1 || sketch.mouseX >= x2 ||
      sketch.mouseY <= y1 || sketch.mouseY >= y2
    ) return
    if(timer.active) {
      timer.pause()
      sketch.redraw()
      sketch.noLoop()
    } else {
      if (timer.finished) {
        timer.reset()
      }
      timer.resume()
      sketch.loop()
    }
  }

  sketch.windowResized = () => {
    sketch.redraw()
  }
}

const getTimerSize = ({windowWidth, windowHeight}) => {
  const minWidth = 100
  const maxWidth = 480
  const netRatio = 1
  const netWidth = Math.max(
    minWidth, Math.min(maxWidth, windowWidth, windowHeight / netRatio))
  return {
    width: Math.max(netWidth, windowWidth),
    height: netWidth * netRatio,
    scale: netWidth / minWidth,
  }
}
