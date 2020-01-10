/*

Markets are a function of time. When watching them, end users must be positioned at one particular point in time. The system currently allows users
to position themselves at any time they like.

In the future, it will be usefull to explore markets and compare them at different times simultaneously. Anticipating that future this module exists.
All the timelineCharts that depand on a datetime are children of this object Time Machine. In the future we will allow users to have more than one Time Machine,
each one with it own timelineCharts, and each one positioned at an especific point in titme.

*/

function newTimeMachine () {
  const MODULE_NAME = 'Time Machine'
  const logger = newWebDebugLog()
  logger.fileName = MODULE_NAME

  let thisObject = {
    container: undefined,
    timeScale: undefined,
    rateScale: undefined,
    fitFunction: undefined,
    payload: undefined,
    timelineCharts: [],
    physics: physics,
    drawBackground: drawBackground,
    draw: draw,
    getContainer: getContainer,     // returns the inner most container that holds the point received by parameter.
    initialize: initialize,
    finalize: finalize
  }

  const SEPARATION_BETWEEN_TIMELINE_CHARTS = 1.5

  let timeLineCoordinateSystem = newTimeLineCoordinateSystem()

  let mouse = {
    position: {
      x: 0,
      y: 0
    }
  }

  let syncWithDesignerLoop = 0
  let timelineChartsMap = new Map()

  let onMouseOverEventSuscriptionId
  let onMouseNotOverEventSuscriptionId
  let timeScaleEventSuscriptionId
  let rateScaleEventSuscriptionId
  let timeScaleMouseOverEventSuscriptionId
  let rateScaleMouseOverEventSuscriptionId

  setupContainer()
  return thisObject

  function setupContainer () {
    thisObject.container = newContainer()
    thisObject.container.initialize(MODULE_NAME)
    thisObject.container.isDraggeable = true
    thisObject.container.insideViewport = true
    thisObject.container.detectMouseOver = true

    thisObject.container.frame.width = TIME_MACHINE_WIDTH
    thisObject.container.frame.height = TIME_MACHINE_HEIGHT
  }

  function finalize () {
    if (thisObject.timeScale !== undefined) {
      finalizeTimeScale()
    }

    if (thisObject.rateScale !== undefined) {
      finalizeRateScale()
    }

    thisObject.container.eventHandler.stopListening(onMouseOverEventSuscriptionId)
    thisObject.container.eventHandler.stopListening(onMouseNotOverEventSuscriptionId)

    for (let i = 0; i < thisObject.timelineCharts.length; i++) {
      let timelineChart = thisObject.timelineCharts[i]
      timelineChart.container.eventHandler.stopListening(timelineChart.onChildrenMouseOverEventSuscriptionId)
      timelineChart.finalize()
    }

    thisObject.timelineCharts = undefined
    timelineChartsMap = undefined

    thisObject.fitFunction = undefined

    thisObject.container.finalize()
    thisObject.container = undefined

    thisObject.payload = undefined
    mouse = undefined
  }

  function finalizeTimeScale () {
    thisObject.timeScale.container.eventHandler.stopListening(timeScaleEventSuscriptionId)
    thisObject.timeScale.container.eventHandler.stopListening(timeScaleMouseOverEventSuscriptionId)
    thisObject.timeScale.finalize()
    thisObject.timeScale = undefined
  }

  function finalizeRateScale () {
    thisObject.rateScale.container.eventHandler.stopListening(rateScaleEventSuscriptionId)
    thisObject.rateScale.container.eventHandler.stopListening(rateScaleMouseOverEventSuscriptionId)
    thisObject.rateScale.finalize()
    thisObject.rateScale = undefined
  }

  function initialize (callBackFunction) {
    recalculateScale()

    onMouseOverEventSuscriptionId = thisObject.container.eventHandler.listenToEvent('onMouseOver', onMouseOver)

    function onMouseOver (event) {
      mouse.position.x = event.x
      mouse.position.y = event.y

      if (thisObject.timeScale !== undefined) {
        thisObject.timeScale.visible = true
        thisObject.timeScale.onMouseOverSomeTimeMachineContainer(event)
      }
      if (thisObject.rateScale !== undefined) {
        thisObject.rateScale.onMouseOverSomeTimeMachineContainer(event)
        thisObject.rateScale.visible = true
      }
    }

    onMouseNotOverEventSuscriptionId = thisObject.container.eventHandler.listenToEvent('onMouseNotOver', onMouseNotOver)

    function onMouseNotOver (event) {
      if (thisObject.timeScale !== undefined) {
        thisObject.timeScale.visible = false
      }
      if (thisObject.rateScale !== undefined) {
        thisObject.rateScale.visible = false
      }
    }

    callBackFunction(GLOBAL.DEFAULT_OK_RESPONSE)
  }

  function initializeTimeScale () {
    thisObject.timeScale = newTimeScale()
    thisObject.timeScale.fitFunction = thisObject.fitFunction
    thisObject.timeScale.payload = thisObject.payload.node.timeScale.payload

    timeScaleEventSuscriptionId = thisObject.timeScale.container.eventHandler.listenToEvent('Lenght Percentage Changed', function (event) {
      thisObject.container.frame.width = TIME_MACHINE_WIDTH * event.lenghtPercentage / 100
      recalculateScale()
      moveToUserPosition(thisObject.container, timeLineCoordinateSystem, false, true, event.mousePosition, false, true)
      thisObject.container.eventHandler.raiseEvent('Dimmensions Changed', event)
    })

    thisObject.timeScale.initialize(timeLineCoordinateSystem, thisObject.container)

    timeScaleMouseOverEventSuscriptionId = thisObject.timeScale.container.eventHandler.listenToEvent('onMouseOver', timeScaleMouseOver)

    function timeScaleMouseOver (event) {
      thisObject.container.eventHandler.raiseEvent('onMouseOver', event)
    }
  }

  function initializeRateScale () {
    thisObject.rateScale = newRateScale()
    thisObject.rateScale.fitFunction = thisObject.fitFunction
    thisObject.rateScale.payload = thisObject.payload.node.rateScale.payload

    rateScaleEventSuscriptionId = thisObject.rateScale.container.eventHandler.listenToEvent('Height Percentage Changed', function (event) {
      thisObject.container.frame.height = TIME_MACHINE_HEIGHT * event.heightPercentage / 100
      recalculateScale()
      moveToUserPosition(thisObject.container, timeLineCoordinateSystem, true, false, event.mousePosition, false, true)
      thisObject.container.eventHandler.raiseEvent('Dimmensions Changed', event)
    })

    thisObject.rateScale.initialize(timeLineCoordinateSystem, thisObject.container)

    rateScaleMouseOverEventSuscriptionId = thisObject.rateScale.container.eventHandler.listenToEvent('onMouseOver', rateScaleMouseOver)

    function rateScaleMouseOver (event) {
      thisObject.container.eventHandler.raiseEvent('onMouseOver', event)
    }
  }

  function getContainer (point, purpose) {
    let container

    if (thisObject.rateScale !== undefined) {
      container = thisObject.rateScale.getContainer(point)
      if (container !== undefined) {
        if (container.isForThisPurpose(purpose)) {
          return container
        }
      }
    }

    if (thisObject.timeScale !== undefined) {
      container = thisObject.timeScale.getContainer(point)
      if (container !== undefined) {
        if (container.isForThisPurpose(purpose)) {
          return container
        }
      }
    }

    for (let i = 0; i < this.timelineCharts.length; i++) {
      container = this.timelineCharts[i].getContainer(point)
      if (container !== undefined) {
        if (container.isForThisPurpose(purpose)) {
          if (thisObject.container.frame.isThisPointHere(point) === true) {
            return container
          }
        }
      }
    }

    if (thisObject.container.frame.isThisPointHere(point) === true) {
      return thisObject.container
    }
  }

  function physics () {
    thisObjectPhysics()
    childrenPhysics()
    syncWithDesigner()
  }

  function syncWithDesigner () {
    syncWithDesignerTimelineCharts()
    syncWithDesignerScales()
  }

  function syncWithDesignerScales () {
    if (thisObject.payload.node.timeScale === undefined && thisObject.timeScale !== undefined) {
      finalizeTimeScale()
    }
    if (thisObject.payload.node.timeScale !== undefined && thisObject.timeScale === undefined) {
      initializeTimeScale()
    }
    if (thisObject.payload.node.rateScale === undefined && thisObject.rateScale !== undefined) {
      finalizeRateScale()
    }
    if (thisObject.payload.node.rateScale !== undefined && thisObject.rateScale === undefined) {
      initializeRateScale()
    }
  }

  function syncWithDesignerTimelineCharts () {
    syncWithDesignerLoop = syncWithDesignerLoop + 0.00000000001

    for (let j = 0; j < thisObject.payload.node.timelineCharts.length; j++) {
      let node = thisObject.payload.node.timelineCharts[j]
      let timelineChart = timelineChartsMap.get(node.id)
      if (timelineChart === undefined) {
              /* The timeline chart node is new, thus we need to initialize a new timelineChart */
        initializeTimelineChart(node, syncWithDesignerLoop)
      } else {
              /* The time machine already exists, we tag it as existing at the current loop. */
        timelineChart.syncWithDesignerLoop = syncWithDesignerLoop
      }
    }

    /* We check all the timeMachines we have to see if we need to remove any of them */
    for (let i = 0; i < thisObject.timelineCharts.length; i++) {
      let timelineChart = thisObject.timelineCharts[i]
      if (timelineChart.syncWithDesignerLoop < syncWithDesignerLoop) {
        /* Must be removed */
        timelineChart.container.eventHandler.stopListening(timelineChart.onChildrenMouseOverEventSuscriptionId)
        timelineChart.finalize()
        timelineChartsMap.delete(timelineChart.nodeId)
        thisObject.timelineCharts.splice(i, 1)
        /* We remove one at the time */
        return
      }
    }

    function initializeTimelineChart (node, syncWithDesignerLoop) {
      let timelineChart = newTimelineChart()
      timelineChart.syncWithDesignerLoop = syncWithDesignerLoop
      timelineChart.payload = node.payload
      timelineChart.nodeId = node.id
      timelineChartsMap.set(node.id, timelineChart)
      timelineChart.payload.uiObject.setValue('Loading...')

      /* Setting up the new timeline chart. */
      timelineChart.container.connectToParent(thisObject.container, true, true, false, true, true, true, false, false, true)
      timelineChart.container.fitFunction = thisObject.container.fitFunction
      timelineChart.container.frame.height = thisObject.container.frame.height
      timelineChart.container.frame.position.x = thisObject.container.frame.width / 2 - timelineChart.container.frame.width / 2
      timelineChart.container.frame.position.y = 0
      timelineChart.initialize(DEFAULT_EXCHANGE, DEFAULT_MARKET, timeLineCoordinateSystem, onTimelineChartInitialized)

      /* we will store the event suscription id as a property of the timelineChart, to avoid keeping it an a separate array */
      timelineChart.onChildrenMouseOverEventSuscriptionId = timelineChart.container.eventHandler.listenToEvent('onChildrenMouseOver', onChildrenMouseOver)

      function onChildrenMouseOver (event) {
        thisObject.container.eventHandler.raiseEvent('onMouseOver', event)
      }

      function onTimelineChartInitialized (err) {
        if (err.result !== GLOBAL.DEFAULT_OK_RESPONSE.result) {
          if (ERROR_LOG === true) { logger.write('[ERROR] syncWithDesigner -> initializeTimelineChart -> Initialization Failed. -> Err ' + err.message) }
          return
        }

        thisObject.timelineCharts.push(timelineChart)
        timelineChart.payload.uiObject.setValue('')
      }
    }
  }

  function thisObjectPhysics () {
    /* Screen Corner Date Calculation */

    let point = {
      x: 0,
      y: 0
    }

    let cornerDate = getDateFromPoint(point, thisObject.container, timeLineCoordinateSystem)
    cornerDate = new Date(cornerDate)
    window.localStorage.setItem('Date @ Screen Corner', cornerDate.toUTCString())
  }

  function childrenPhysics () {
    if (thisObject.timeScale !== undefined) {
      thisObject.timeScale.physics()
    }
    if (thisObject.rateScale !== undefined) {
      thisObject.rateScale.physics()
    }

    for (let i = 0; i < thisObject.timelineCharts.length; i++) {
      let chart = thisObject.timelineCharts[i]
      chart.physics()
    }
  }

  function drawBackground () {
    if (thisObject.container.frame.isInViewPort()) {
      for (let i = 0; i < this.timelineCharts.length; i++) {
        let chart = this.timelineCharts[i]
        chart.drawBackground()
      }
    }
  }

  function draw () {
    if (thisObject.container.frame.isInViewPort()) {
      for (let i = 0; i < this.timelineCharts.length; i++) {
        let chart = this.timelineCharts[i]
        chart.draw()
      }

      if (thisObject.timeScale !== undefined) { thisObject.timeScale.draw() }
      if (thisObject.rateScale !== undefined) { thisObject.rateScale.draw() }

      thisObject.container.frame.draw(false, true, false, thisObject.fitFunction)
    }
  }

  function recalculateScale () {
    let minValue = {
      x: MIN_PLOTABLE_DATE.valueOf(),
      y: 0
    }

    let maxValue = {
      x: MAX_PLOTABLE_DATE.valueOf(),
      y: nextPorwerOf10(USDT_BTC_HTH) / 4
    }

    timeLineCoordinateSystem.initialize(
          minValue,
          maxValue,
          thisObject.container.frame.width,
          thisObject.container.frame.height
      )
  }
}
