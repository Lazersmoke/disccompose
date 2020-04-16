selectedStep = 0

function refreshActionSequenceDisplay(){
  var actList = document.getElementById("actionList")
  actList.innerHTML = ""
  activeActionSequence.forEach((x,i) => {
    var newElem = document.createElement("LI")
    newElem.setAttribute("class","alternate action flexy")
    var theSpan = document.createElement("SPAN")
    theSpan.appendChild(document.createTextNode(x.id))
    theSpan.setAttribute("class","growy")
    newElem.appendChild(theSpan)
    if(x.params){
      var paramTable = document.createElement("TABLE")
      for(const prop in x.params){
        var thisRow = document.createElement("TR")
        thisRow.setAttribute("class","param alternate")
        var paramName = document.createElement("TD")
        paramName.appendChild(document.createTextNode(prop))
        thisRow.appendChild(paramName)
        var paramVal = document.createElement("TD")
        paramVal.appendChild(document.createTextNode(x.params[prop]))
        thisRow.appendChild(paramVal)
        paramTable.appendChild(thisRow)
      }
      newElem.appendChild(paramTable)
    }
    if(i == selectedStep)
      theSpan.style.fontWeight = "bold"
    newElem.addEventListener("click", event => {
      event.preventDefault();
      selectedStep = i
      refreshActionSequenceDisplay()
      resetStepEditor()
    })
    actList.appendChild(newElem)
  })
  document.getElementById("actionSeqDump").value = JSON.stringify(activeActionSequence)
  savelink = document.getElementById("savelink")
  savelink.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(document.getElementById("actionSeqDump").value));
}

function resetStepEditor(){
  if(!document.getElementById("copybox").checked){
    document.getElementById("stepEditIdBox").value = ""
    refreshStepEditor(true)
  }
}

function selectedAction(){
  return activeActionSequence[selectedStep]
}

function checkEditIdBox(){
  var editIdBox = document.getElementById("stepEditIdBox")
  var assocAct = knownActions[editIdBox.value]
  if(!assocAct){
    editIdBox.style.borderColor = "#ff0000"
    return
  }
  editIdBox.style.borderColor = "#00ff00"
  return assocAct
}

function refreshStepEditor(isCommit){
  var editIdBox = document.getElementById("stepEditIdBox")
  var paramEditList = document.getElementById("paramEditList")
  paramEditList.innerHTML = ""
  if(!editIdBox.value && isCommit){
    var selectedStep = selectedAction()
    editIdBox.value = selectedStep.id
  }
  var assocAct = checkEditIdBox()
  if(!assocAct) return
  if(!assocAct.params) return
  assocAct.params.forEach((x,i) => {
    var newElem = document.createElement("LI")
    if(i % 2)
      newElem.setAttribute("style", "background-color: lightgreen");
    else
      newElem.setAttribute("style", "background-color: lightblue");
    newElem.appendChild(document.createTextNode(x + ": "))
    var theBox = document.createElement("TEXTAREA");
    theBox.setAttribute("type", "text");
    theBox.setAttribute("style", "width: 300px; height: 30px");
    if(selectedAction().params && selectedAction().params[x]){
      theBox.value = selectedAction().params[x]
    }
    theBox.addEventListener("keyup", event => {
      event.preventDefault();
      if (event.keyCode === 13) updateButton() // Enter pressed
    })
    newElem.appendChild(theBox);
    paramEditList.appendChild(newElem)
  })
}

function noParamAction(actionId){
  return {id: actionId}
}

// Action prototype: {id:"name of action", params: {a: (...), b: (...)}}
// Implementation prototype: {"act": (params,ctx) => (...),params:["a","b"]}

function sequence(actionSequence,ctxZero){
  return actionSequence.reduce((ctx,action) => getActionById(action.id)(action.params,ctx),ctxZero)
}

knownActions = {}

knownActions["nop"] = {act: (params,ctx) => ctx}

function getActionById(actionId){
  return knownActions[actionId].act
}

knownActions["graphCtx"] = {act: (params,ctx) => {
  var canv = document.getElementById("graphArea")
  var w = canv.width
  var h = canv.height
  var c = canv.getContext("2d")
  c.clearRect(0,0,w,h)
  var heights = ctx.map(y => h-(y * h))
  var dx = w/ctx.length
  var x = 0
  c.moveTo(0,heights[0])
  heights.slice(1).forEach(height => {
    x = x + dx
    c.lineTo(x,height)
  })
  c.stroke()
  return ctx
}}

knownActions["scatterCtx"] = {act: (params,ctx) => {
  var canv = document.getElementById("graphArea")
  var w = canv.width
  var h = canv.height
  var c = canv.getContext("2d")
  var minX = Math.min(...ctx.map(pt => pt.x))
  var maxX = Math.max(...ctx.map(pt => pt.x))
  c.clearRect(0,0,w,h)
  ctx.forEach(pt => {
    c.beginPath()
    c.arc(w * (pt.x - minX)/(maxX - minX),h - (pt.y * h),5,0,6.3)
    c.fill()
  })
  return ctx
}}

knownActions["deltas"] = {params:["data"],act: (params,ctx) => {
  return eval(params.data).map(xyarr => {return {x: xyarr[0],y: xyarr[1]}})
}}

knownActions["normalizeDeltas"] = {params: ["normalizationFactor"],act: (params,ctx) => {
  if(params && params.normalizationFactor)
    return ctx.map(pt => {pt.y = y/params.normalizationFactor; return pt})
  var maxNum = Math.max(...ctx.map(pt => pt.y))
  var minNum = Math.min(...ctx.map(pt => pt.y))
  return ctx.map(pt => {pt.y = (pt.y - minNum)/(maxNum - minNum); return pt})
}}

knownActions["normalizeAudio"] = {act: (params,ctx) => {
  var maxNum = Math.max(...ctx.map(pt => pt.y))
  var minNum = Math.min(...ctx.map(pt => pt.y))
  return ctx.map(pt => {pt.y = (2 * (pt.y - minNum)/(maxNum - minNum)) - 1; return pt})
}}

knownActions["normalize"] = {params: ["normalizationFactor"],act: (params,ctx) => {
  if(params && params.normalizationFactor)
    return ctx.map(x => x/params.normalizationFactor)
  var maxNum = Math.max(...ctx)
  return ctx.map(x => x/maxNum)
}}

knownActions["setCtx"] = {act: (params,ctx) => {
  return params.ctx
}}

// \u03BC
knownActions["muDots"] = {params:["mu(x)"], act: (params,ctx) => {
  var mu = eval("x => (" + params["mu(x)"] + ")")
  return ctx.map(pt => {
    pt.y = pt.y * mu(pt.x)
    return pt
  })
}}

knownActions["applyFunc"] = {params:["f(y)"], act: (params,ctx) => {
  var f = eval("y => (" + params["f(y)"] + ")")
  return ctx.map(pt => {
    pt.y = f(pt.y)
    return pt
  })
}}


knownActions["harmonics"] = {params:["f0","n"], act: (params,ctx) => {
  var fund = eval(params["f0"])
  var numHarmonics = eval(params["n"])
  var ctx = []
  for(i = 1; i <= numHarmonics; i++){
    ctx.push({x: fund * i,y : 1})
  }
  return ctx
}}

function dataToXY(data){
  return data.map(d => {return {x: d[0], y: d[1]}})
}

knownActions["kern"] = {params:["kernel"], act: (params,ctx) => {
  var kernel = eval(params["kernel"])
  var newctx = []
  ctx.forEach(pt => {
    kernel.forEach(k => {
      newctx.push({x: pt.x + k.x, y: pt.y * k.y})
    })
  })
  return newctx
}}

knownActions["kerncmag"] = {params:["kernelRe","kernelIm"], act: (params,ctx) => {
  var outRe = knownActions["kern"].act({kernel: params["kernelRe"]},ctx)
  var outIm = knownActions["kern"].act({kernel: params["kernelIm"]},ctx)

  var summedRe = knownActions["sumDeltas"].act({eps: 0.01},outRe)
  var summedIm = knownActions["sumDeltas"].act({eps: 0.01},outIm)

  var sqRe = knownActions["applyFunc"].act({"f(y)": "y*y"},summedRe)
  var sqIm = knownActions["applyFunc"].act({"f(y)": "y*y"},summedIm)

  var bothSq = sqRe + sqIm

  return knownActions["sumDeltas"].act({eps: 0.01},bothSq)
}}

knownActions["sumDeltas"] = {params:["eps"],act: (params,ctx) => {
  var eps = eval(params["eps"])
  var newctx = []
  var xvals = ctx.map(pt => pt.x)
  xvals.forEach(thisX => {
    var sum = 0
    ctx.forEach(pt => {
      if(eps > Math.abs(pt.x - thisX)){
        sum += pt.y
      }
    })
    newctx.push({x: thisX, y: sum})
  })
  return newctx
}}

knownActions["rescalex"] = {params:["factor"], act: (params,ctx) => {
  var factor = eval(params["factor"])
  return ctx.map(pt => {pt.x = pt.x * factor; return pt})
}}

knownActions["isft"] = {params:["dt","time","phaseSlope"], act: (params,ctx) => {
  var stepSize = eval(params["dt"])
  var endTime = eval(params["time"])
  var phaseSlope = eval(params["phaseSlope"])
  var output = []
  for(var t = 0; t <= endTime; t += stepSize){
    var ctxcopy = ctx
    output.push({x: t, y: ctxcopy.map(pt => pt.y * Math.cos(pt.x * (2 * Math.PI * t + phaseSlope))).reduce((a,b) => a + b,0)})
  }
  return output
}}

knownActions["logctx"] = {act: (params,ctx) => {
  console.log(ctx)
  return ctx
}}


knownActions["samplef"] = {params:["f(x)","dt","t0","tf"], act: (params,ctx) => {
  var f = eval("x => (" + params["f(x)"] + ")")
  var stepSize = eval(params["dt"])
  var startTime = eval(params["t0"])
  var endTime = eval(params["tf"])
  var output = []
  for(var x = startTime; x <= endTime; x += stepSize){
    output.push({x: x, y: f(x)})
  }
  return output
}}

knownActions["chop"] = {params:["t0","tf"], act: (params,ctx) => {
  var startTime = eval(params["t0"])
  var endTime = eval(params["tf"])
  return ctx.filter(pt => pt.x < endTime && pt.x > startTime)
}}

knownActions["listen"] = {act: (params,ctx) => {
  var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  var myArrayBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 3, audioCtx.sampleRate);
  for (var channel = 0; channel < myArrayBuffer.numberOfChannels; channel++) {
    var nowBuffering = myArrayBuffer.getChannelData(channel);
    for (var i = 0; i < myArrayBuffer.length; i++) {
      nowBuffering[i] = ctx[i].y
    }
  }
  var source = audioCtx.createBufferSource();
  source.buffer = myArrayBuffer;
  source.connect(audioCtx.destination);
  if(!document.getElementById("mutebox").checked) source.start()
  return ctx
}}

function runButton(){
  sequence(activeActionSequence,{})
}

function actionFromStepEditor(){
  var editIdBox = document.getElementById("stepEditIdBox")
  var newActionId = editIdBox.value
  if(!knownActions[newActionId]) return
  var paramEditList = document.getElementById("paramEditList")
  givenParams = Array.prototype.slice.call(paramEditList.childNodes).reduce((params,x) => {
    if(x.childNodes[1].value) params[x.childNodes[0].textContent.slice(0,-2)] = x.childNodes[1].value
    return params
  },{})
  if (Object.keys(givenParams).length === 0){
    return {id: newActionId}
  }
  return {id: newActionId,params: givenParams}
}

function insertButton(){
  insertedAction = actionFromStepEditor()
  if(!insertedAction) return
  activeActionSequence.splice(selectedStep,0,insertedAction)
  resetStepEditor()
  refreshActionSequenceDisplay()
}

function deleteButton(){
  activeActionSequence.splice(selectedStep,1)
  selectedStep = Math.min(activeActionSequence.length - 1,selectedStep)
  resetStepEditor()
  refreshActionSequenceDisplay()
}

function updateButton(){
  updatedAction = actionFromStepEditor()
  if(!updatedAction) return
  activeActionSequence[selectedStep] = updatedAction
  resetStepEditor()
  refreshActionSequenceDisplay()
}

function clearButton(){
  activeActionSequence = []
  refreshActionSequenceDisplay()
}
function popButton(){
  activeActionSequence.pop()
  refreshActionSequenceDisplay()
}

function pushButton(){
  activeActionSequence.push(noParamAction("nop"))
  refreshActionSequenceDisplay()
}

window.onload = function(){
  var editIdBox = document.getElementById("stepEditIdBox")
  editIdBox.addEventListener("input", event => {
    refreshStepEditor(false)
  })
  editIdBox.addEventListener("change", event => {
    refreshStepEditor(true)
  })
  refreshActionSequenceDisplay()
  resetStepEditor()
  runButton()
  var kal = document.getElementById("knownActionList")
  for(const prop in knownActions){
    var newElem = document.createElement("LI")
    newElem.appendChild(document.createTextNode(prop))
    if(knownActions[prop].params){
      newElem.appendChild(document.createTextNode(" with params: " + knownActions[prop].params))
    }
    kal.appendChild(newElem)
  }
  document.getElementById("actionSeqDump").addEventListener("change", event => {
    activeActionSequence = JSON.parse(document.getElementById("actionSeqDump").value)
    refreshActionSequenceDisplay()
    resetStepEditor()
  })
  document.getElementById("saveNameBox").value = "patch.json"

  // Refresh upload thing
  document.getElementById("openFileUpload").remove()
  var newUploadBox = document.createElement("INPUT")
  newUploadBox.setAttribute("id","openFileUpload")
  newUploadBox.setAttribute("type","file")
  document.getElementById("openFileDiv").appendChild(newUploadBox)

  document.getElementById("openFileUpload").addEventListener("change", event => {
    reloadFileButton()
  })

  document.getElementById("saveNameBox").addEventListener("change", event => {
    savelink = document.getElementById("savelink")
    savelink.setAttribute('download', document.getElementById("saveNameBox").value);
  })
}

function reloadFileButton(){
  document.getElementById("openFileUpload").files[0].text().then(patchData => {
    activeActionSequence = JSON.parse(patchData)
    refreshActionSequenceDisplay()
    resetStepEditor()
    document.getElementById("openFileUpload").files = []
  })
}

document.addEventListener('keydown', evt => {
  //if(evt.repeat) { return }
  if(evt.keyCode == 38){ selectedStep = mod(selectedStep - 1, activeActionSequence.length); refreshActionSequenceDisplay(); resetStepEditor();} // Up arrow
  if(evt.keyCode == 40){ selectedStep = mod(selectedStep + 1, activeActionSequence.length); refreshActionSequenceDisplay(); resetStepEditor();} // Down arrow
}, false);
function mod(n, m) {
  return ((n % m) + m) % m;
}
document.addEventListener('keyup', evt => {
}, false);
activeActionSequence = [{"id":"harmonics","params":{"f0":"1","n":"15"}},{"id":"kern","params":{"kernel":"sequence([{\"id\":\"samplef\",\"params\":{\"f(x)\":\"Math.exp(-0.5*x*x)\",\"dt\":\"0.2\",\"t0\":\"-0.4\",\"tf\":\"0.4\"}}])"}},{"id":"rescalex","params":{"factor":"440"}},{"id":"muDots","params":{"mu(x)":"1/(x*x)"}},{"id":"isft","params":{"dt":"1/48000","time":"3","phaseSlope":"1"}},{"id":"normalizeAudio"},{"id":"listen"},{"id":"normalizeDeltas"},{"id":"chop","params":{"t0":"0","tf":"0.02"}},{"id":"scatterCtx"},{"id":"nop"}]
