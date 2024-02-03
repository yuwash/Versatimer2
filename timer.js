import { configureStore, createSlice } from '@reduxjs/toolkit'

const setState = (state, action) => {
  if(!(action.payload.key in state)) {
    return state
  }
  state[action.payload.key] = action.payload.state
  return state
}

const setStateAttr = (state, action) => {
  if(!(action.payload.key in state)) {
    return state
  }
  state[action.payload.key][action.payload.attr] = action.payload.value
  return state
}

export const timersSlice = createSlice({
  name: 'timers',
  initialState: {},
  reducers: {
    addTimer: (state, action) => (
      {...state, [action.payload.key]: action.payload.initialState}),
    setState,
    setStateAttr,
  }
})

export const store = configureStore({reducer: timersSlice.reducer})

let nextTimerId = 1

class Timer {
  constructor(state) {
    this.id = nextTimerId++
    store.dispatch(timersSlice.actions.addTimer({
      key: this.id,
      initialState: state,
    }))
  }

  get active() {
    return this.state.active
  }

  set active(value) {
    this.setStateAttr('active', value)
  }

  get working() {
    const sessionSequence = this.sessionSequence
    const latestPeriod = (
      sessionSequence[sessionSequence.length - 1])
    return latestPeriod ? latestPeriod.working : false
  }

  get elapsed() {
    return this.state.elapsed
  }

  set elapsed(value) {
    this.setStateAttr('elapsed', value)
  }

  get lastUpdate() {
    return this.state.lastUpdate
  }

  set lastUpdate(value) {
    this.setStateAttr('lastUpdate', value)
  }

  get elapsedRelative() {
    return this.elapsed / this.sessionDuration
  }

  get sessionDuration() {
    return this.state.schedule.reduce((acc, {duration}) => acc + duration, 0)
  }

  get remaining() {
    const sessionSequence = this.sessionSequence
    const latestPeriod = (
      sessionSequence[sessionSequence.length - 1])
    return latestPeriod ? (
      latestPeriod.start + latestPeriod.period - this.elapsed
    ) : 0
  }

  get sessionRemaining() {
    return this.sessionDuration - this.elapsed
  }

  get finished() {
    return this.elapsed >= this.sessionDuration
  }

  get sessionSequence() {
    const elapsed = this.elapsed
    const [sequence, _] = this.state.schedule.reduce(
      ([acc, remainingElapsed], {work, rest, duration}) => {
	let remainingDuration = duration
	let working = true
	while(remainingElapsed && 0 < remainingDuration) {
	  const period = working ? work : rest
          let elapsedPeriodDuration = remainingElapsed
          const prevRemainingElapsed = remainingElapsed
    const specificPeriod = Math.min(period, remainingDuration)
	  if(remainingElapsed < period) {
	    remainingElapsed = 0
	    // remainingDuration, working don’t matter; loop ends
	  } else {
	    elapsedPeriodDuration = period
	    remainingElapsed -= period
	    remainingDuration -= period
	  }
	  acc.push({
      period: specificPeriod,
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

  setStateAttr(attr, value) {
    store.dispatch(timersSlice.actions.setStateAttr(
      {attr, key: this.id, value}))
  }

  get state() {
    return store.getState()[this.id]
  }

  set state(state) {
    store.dispatch(timersSlice.actions.setState({key: this.id, state}))
  }

  pause() {
    this.updateElapsed()
    this.active = false
  }

  resume() {
    this.active = true
    this.lastUpdate = Date.now()
    // don’t call updateElapsed because the time since pause should be
    // ignored
  }

  reset() {
    this.elapsed = 0
  }

  updateElapsed() {
    if(!this.active) {
      return
    }
    const now = Date.now()
    const elapsed = (
      this.elapsed + (now - this.state.lastUpdate) / 1000)  // ms -> s 
    const sessionDuration = this.sessionDuration
    if(sessionDuration <= elapsed) {
      this.active = false
      this.elapsed = sessionDuration
    } else {
      this.elapsed = elapsed
    }
    this.lastUpdate = now
  }
}

export default Timer
