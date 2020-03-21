const p5 = require('p5')
import Timer from "./timer"

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

const main = () => {
  const timerRoots = document.getElementsByClassName('timer')
  const timerP5s = Array.from(timerRoots).map(
    root => new p5(initTimerSketch, root))
}

const initTimerSketch = (sketch) => {
  const timer = new Timer()
  const sounds = Object.fromEntries(Object.entries(SOUNDS).map(
    ([key, name]) => [key, sketch.select('#audio-' + name).elt]))
  let working = false  // let the initial start of work register

  sketch.setup = () => {
    sketch.noFill()
    sketch.frameRate(1)
  }

  sketch.draw = () => {
    const prevActive = timer.active
    timer.updateElapsed()
    const active = timer.active
    const pallette = active ? COLORS : COLORS_DISABLED
    const elapsedRelative = timer.elapsedRelative
    const size = getTimerSize(sketch)
    const strokeWeight = 5 * size.scale
    sketch.strokeWeight(strokeWeight)
    const clockMargin = strokeWeight
    const clockRadius = size.height / 2 - clockMargin
    const clockCenter = [size.width / 2, clockRadius + clockMargin]
    const handLength = clockRadius - 2 * strokeWeight
    const handPosition = getHandPosition(
      clockCenter, handLength, elapsedRelative)
    sketch.resizeCanvas(size.width, size.height)
    sketch.noStroke()
    sketch.fill(pallette.light)
    sketch.circle(...clockCenter, 2 * clockRadius)
    sketch.noFill()
    sketch.stroke(pallette.peach)  // rest
    drawArcForDuration(sketch, ...clockCenter, clockRadius, 0, elapsedRelative)
    const sessionSequenceRelative = timer.sessionSequenceRelative
    const latestPeriod = (
      sessionSequenceRelative[sessionSequenceRelative.length - 1])
    const prevWorking = working
    if(latestPeriod) {
      working = latestPeriod.working
    }
    sessionSequenceRelative.forEach(({duration, start, working: working_}) => {
      if(!working_) {
        return
      }
      sketch.stroke(pallette.dark)  // work
      drawArcForDuration(
        sketch, ...clockCenter, clockRadius, start, start + duration)
    })
    sketch.stroke(pallette.dark)
    sketch.circle(...clockCenter, strokeWeight)
    sketch.line(...clockCenter, ...handPosition)
    if(!active && prevActive && elapsedRelative === 1) {
      sounds.end.play()
    } else if(working && !prevWorking) {
      sounds.work.play()
    } else if(!working && prevWorking) {
      sounds.rest.play()
    }
  }

  sketch.mouseClicked = () => {
    if(timer.active) {
      timer.pause()
      sketch.redraw()
      sketch.noLoop()
    } else {
      timer.resume()
      sketch.loop()
    }
  }

  sketch.windowResized = () => {
    sketch.redraw()
  }
}

const drawArcForDuration = (sketch, x, y, radius, start, stop) => {
  const angleUnit = 2 * Math.PI
  const clockStartAngle = - angleUnit / 4
  sketch.arc(
    x, y, 2 * radius, 2 * radius,
    clockStartAngle + start * angleUnit, clockStartAngle + stop * angleUnit)
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

const getHandPosition = (clockCenter, length, ratio) => {
  const clockwiseAngle = ratio * 2 * Math.PI
  return [Math.sin(clockwiseAngle), -Math.cos(clockwiseAngle)].map(
    (x_or_y, i) => clockCenter[i] + length * x_or_y)
}

main()
