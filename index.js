const p5 = require('p5')

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

class Clock {
  constructor(state) {
    this.state = {
      active: true,
      elapsed: 0,
      round: 0,
      schedule: [
	{work: 7, rest: 4, duration: 20},
      ],
      lastUpdate: Date.now(),
    }
  }

  get active() {
    return this.state.active
  }

  get elapsedRelative() {
    return this.state.elapsed / this.sessionDuration
  }

  get sessionDuration() {
    return this.state.schedule.reduce((acc, {duration}) => acc + duration, 0)
  }

  get sessionSequence() {
    const elapsed = this.state.elapsed
    const [sequence, _] = this.state.schedule.reduce(
      ([acc, remainingElapsed], {work, rest, duration}) => {
	let remainingDuration = duration
	let working = true
	while(remainingElapsed && 0 < remainingDuration) {
	  const period = working ? work : rest
          let elapsedPeriodDuration = remainingElapsed
          const prevRemainingElapsed = remainingElapsed
	  if(remainingElapsed < period) {
	    remainingElapsed = 0
	    // remainingDuration, working don’t matter; loop ends
	  } else {
	    elapsedPeriodDuration = period
	    remainingElapsed -= period
	    remainingDuration -= period
	  }
	  acc.push({
	    duration: elapsedPeriodDuration,
	    start: elapsed - prevRemainingElapsed,
	    working,
	  })
          working ^= true
	}
	return [acc, remainingElapsed]
      }, [[], elapsed])
    return sequence
  }

  get sessionSequenceRelative() {
    const sessionDuration = this.sessionDuration
    return this.sessionSequence.map(({duration, start, working}) => ({
      duration: duration / sessionDuration,
      start: start / sessionDuration,
      working,
    }))
  }

  pause() {
    this.updateElapsed()
    this.state.active = false
  }

  resume() {
    this.state.active = true
    this.state.lastUpdate = Date.now()
    // don’t call updateElapsed because the time since pause should be
    // ignored
  }

  updateElapsed() {
    if(!this.state.active) {
      return
    }
    const now = Date.now()
    const elapsed = (
      this.state.elapsed + (now - this.state.lastUpdate) / 1000)  // ms -> s 
    const sessionDuration = this.sessionDuration
    if(sessionDuration <= elapsed) {
      this.state.active = false
      this.state.elapsed = sessionDuration
    } else {
      this.state.elapsed = elapsed
    }
    this.state.lastUpdate = now
  }
}

const initTimerSketch = (sketch) => {
  const clock = new Clock()
  const sounds = Object.fromEntries(Object.entries(SOUNDS).map(
    ([key, name]) => [key, sketch.select('#audio-' + name).elt]))
  let working = false  // let the initial start of work register

  sketch.setup = () => {
    sketch.noFill()
    sketch.frameRate(1)
  }

  sketch.draw = () => {
    const prevActive = clock.active
    clock.updateElapsed()
    const active = clock.active
    const pallette = active ? COLORS : COLORS_DISABLED
    const elapsedRelative = clock.elapsedRelative
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
    const sessionSequenceRelative = clock.sessionSequenceRelative
    const latestPeriod = (
      sessionSequenceRelative[sessionSequenceRelative.length - 1])
    const prevWorking = working
    working = latestPeriod.working
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
    if(clock.active) {
      clock.pause()
      sketch.redraw()
      sketch.noLoop()
    } else {
      clock.resume()
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
