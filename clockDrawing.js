const getHandPosition = (clockCenter, length, ratio) => {
  const clockwiseAngle = ratio * 2 * Math.PI
  return [Math.sin(clockwiseAngle), -Math.cos(clockwiseAngle)].map(
    (x_or_y, i) => clockCenter[i] + length * x_or_y)
}

const getArcForDuration = (start, stop) => {
  const angleUnit = 2 * Math.PI
  const clockStartAngle = - angleUnit / 4
  return [
    clockStartAngle + start * angleUnit,
    clockStartAngle + stop * angleUnit
  ]
}

class ClockDrawing {
  constructor(timer) {
      this.timer = timer
  }

  getParams(size, strokeWeight) {
    const clockMargin = strokeWeight
    const clockRadius = size.height / 2 - clockMargin
    const clockCenter = [size.width / 2, clockRadius + clockMargin]
    const elapsedRelative = this.timer.elapsedRelative
    const handLength = clockRadius - 2 * strokeWeight
    const handPosition = getHandPosition(
        clockCenter, handLength, elapsedRelative)
    const edgePosition = getHandPosition(
        clockCenter, clockRadius, elapsedRelative)
    const restArc = getArcForDuration(0, elapsedRelative)
    const sessionSequenceRelative = this.timer.sessionSequenceRelative
    const workArcs = sessionSequenceRelative.reduce(
      (arcs, {duration, start, working: working_}) => {
        if(working_) {
          arcs.push(
            getArcForDuration(start, start + duration))
        }
        return arcs
      },
      [])
    return { clockCenter, clockRadius, handPosition, edgePosition, restArc, size, strokeWeight, workArcs }
  }
}

export default ClockDrawing