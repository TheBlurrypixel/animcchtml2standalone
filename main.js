const {app, dialog, BrowserWindow} = require('electron');
const path = require('path');
const url = require('url');

const ProgressBar = require('electron-progressbar');
const prompt = require('electron-prompt');

var fs = require('fs')
var jsdom = require('jsdom');
const { JSDOM } = jsdom;

// var win;

// function createWindow() {
// 	// Create the browser window.
// 	win = new BrowserWindow({ frame: false, width:900, height:900});
//
// 	// Emitted when the window is closed.
// 	win.on('closed', () => { win = null; app.quit(); });
//
// 	// and load the index.html of the app.
// 	win.loadURL(url.format( {
// 		pathname: path.join(__dirname, 'validator.html'),
// 		protocol: 'file:',
// 		slashes: true
// 	}));
//
// //	win.webContents.openDevTools()
// }

// referenceNode being the element to insert after
function insertAfter(newNode, referenceNode) {
	referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}

function start() {
	var directory = "";

	function loadHTML(err, html_string, filepath, inStretchingRatio, inAspectLimit, inline, inlineImages, enableStageGL, fixPreloader, convRes) {
		if(!html_string) return false;

		var found = html_string.match(/<html>/g);

		var stretchRatioFloat = parseFloat(inStretchingRatio);
		var aspectLimitFloat = parseFloat(inAspectLimit);
		var excludeAspectCode = (aspectLimitFloat == 0);

		var progressBar = new ProgressBar( {text: 'Processing file...', detail: 'Wait...'} );
		progressBar.on('completed', () => progressBar.detail = 'Task completed. Exiting...').on('aborted', () => app.quit());

		var fileContent = html_string.replace(/^\uFEFF/, '');

		const dom = new JSDOM(fileContent);

		var scriptInputs = dom.window.document.getElementsByTagName('script');

		function processScriptTag(element, data) {
			var par = element.parentNode;
			var elmnt = dom.window.document.createElement("script");
			var textnode = dom.window.document.createTextNode('\n' + data + '\n');
			elmnt.appendChild(textnode);
			par.replaceChild(elmnt, element);
		}

		function convertImgToDataURI(inSrc) {
			var imageAsBase64;
			var imageAsData = null;
			if(inSrc.startsWith('http')) {
				var content = require('child_process').execFileSync('curl', ['--silent', '-L', inSrc], {encoding: 'base64'});
				imageAsBase64 = content;
			}
			else {
				var tempPath = path.join(directory, inSrc);
				if(fs.existsSync(tempPath)) {
					imageAsBase64 = fs.readFileSync(tempPath, 'base64');
				}
			}

			// determine if png or jpg
			var indexOfPeriod = inSrc.lastIndexOf('.');
			if(indexOfPeriod > -1) {
				var extensionString = inSrc.substr(indexOfPeriod+1, inSrc.length-indexOfPeriod-1);

				if(extensionString.localeCompare("png")==0)
					imageAsData = "data:image/png;base64," + imageAsBase64;
				else if((extensionString.localeCompare("jpg")==0) || (extensionString.localeCompare("jpeg")==0))
					imageAsData = "data:image/jpg;base64," + imageAsBase64;
				else if(extensionString.localeCompare("gif")==0)
					imageAsData = "data:image/gif;base64," + imageAsBase64;
			}

			return imageAsData;
		}

		function processImgTag(element) {
			var imageAsData = convertImgToDataURI(element.src);
			element.src = imageAsData;
		}

		function processScriptSrc(elememt) {
			// save a handle to the "this" pointer
			var myElement = elememt;

			// this is an anonymous function
			return function (err, data) {
				var par = myElement.parentNode;
				var elmnt = dom.window.document.createElement("script");
				var textnode = dom.window.document.createTextNode('\n' + data + '\n');
				elmnt.appendChild(textnode);
				par.replaceChild(elmnt, myElement);
			}
		}

		function findEndingBrace(inString, startingIndex) {
			var leftCurlyBraceIndex = inString.indexOf('{', startingIndex);// index of the '{' to which you need to find the matching '}'
			var rightCurlyBracesTobeIgnored = 0;
			var rightCurlyBraceIndex = -1;

			for (var i = leftCurlyBraceIndex + 1, len = inString.length; i < len; i++) {
				if(inString.charAt(i) == '}') {
					if (rightCurlyBracesTobeIgnored == 0) {
 						rightCurlyBraceIndex = i;
						break;
					}
					else
						rightCurlyBracesTobeIgnored--;
				}
				else if(inString.charAt(i) == '{')
					rightCurlyBracesTobeIgnored += 1;
			}
			return rightCurlyBraceIndex;
		}

		var replacedCreateJS = false;
		if(enableStageGL || convRes) {
			var tempSIndex = 0;
			while(tempSIndex < scriptInputs.length) {
				if(scriptInputs[tempSIndex].hasAttribute('src')) {
					if(!replacedCreateJS && (scriptInputs[tempSIndex].src.search(/\bcreatejs\b.*\.js$/) > -1)) {
						scriptInputs[tempSIndex].src = "https://code.createjs.com/1.0.0/createjs.min.js";
						replacedCreateJS = true;
					}
				}

				if(convRes) {
					var newText = scriptInputs[tempSIndex].text.replace(/Ticker.setFPS\((.+)\)/g, "Ticker.framerate = $1").replace(/\.getNumChildren\(\)/g, ".numChildren");
	
					var par = scriptInputs[tempSIndex].parentNode;
					var elmnt = dom.window.document.createElement("script");
					var textnode = dom.window.document.createTextNode(newText + '\n');

					elmnt.appendChild(textnode);
					par.replaceChild(elmnt, scriptInputs[tempSIndex]);
				}

				tempSIndex++;
			}
		}

		// convert to stageGL code
		if(enableStageGL) {
			var tempScriptIndex = 0;
			var stageGLScriptIndex = -1;
			var responsiveScriptIndex = -1;
			while(tempScriptIndex < scriptInputs.length) {
				if((stageGLScriptIndex < 0) && (scriptInputs[tempScriptIndex].text.search(/\bnew createjs.Stage\b/) > -1))
					stageGLScriptIndex = tempScriptIndex;

				if((responsiveScriptIndex < 0) && (scriptInputs[tempScriptIndex].text.search(/\bfunction makeResponsive\b/) > -1))
					responsiveScriptIndex = tempScriptIndex;

				if((stageGLScriptIndex > -1) && (responsiveScriptIndex > -1))
					break;

				tempScriptIndex++;
			}

			if(stageGLScriptIndex > -1) {
				var newText = scriptInputs[stageGLScriptIndex].text.replace(/\bnew createjs.Stage\b/, 'new createjs.StageGL').replace(/\bcreatejs.Stage.call\(this, canvas\)/, 'createjs.StageGL.call(this, canvas, { antialias: true })');

				var par = scriptInputs[stageGLScriptIndex].parentNode;
				var elmnt = dom.window.document.createElement("script");

				var textnode = dom.window.document.createTextNode(newText + '\n');
				elmnt.appendChild(textnode);
				par.replaceChild(elmnt, scriptInputs[stageGLScriptIndex]);
			}

			if(responsiveScriptIndex > -1) {
				var responsiveFuncIndex = scriptInputs[responsiveScriptIndex].text.search(/\bfunction makeResponsive\b/);
				var endingText = scriptInputs[responsiveScriptIndex].text.substring(responsiveFuncIndex);
				var stageUpdateIndex = endingText.search(/\bstage.update\(\)/);
				var newText = scriptInputs[responsiveScriptIndex].text.substring(0, responsiveFuncIndex+stageUpdateIndex) + "stage.updateViewport(canvas.width, canvas.height);\n\t\t\t" + scriptInputs[responsiveScriptIndex].text.substring(responsiveFuncIndex+stageUpdateIndex, scriptInputs[responsiveScriptIndex].text.length);

				var par = scriptInputs[responsiveScriptIndex].parentNode;
				var elmnt = dom.window.document.createElement("script");

				var textnode = dom.window.document.createTextNode(newText + '\n');
				elmnt.appendChild(textnode);
				par.replaceChild(elmnt, scriptInputs[responsiveScriptIndex]);
			}
		}

		// replace linked libraries with inline scripts
		if(inline) {
			for(var i = 0; i < scriptInputs.length; i++) {
				if(scriptInputs[i].hasAttribute('src')) {
					if(scriptInputs[i].src.startsWith('http')) {
						var content = require('child_process').execFileSync('curl', ['--silent', '-L', scriptInputs[i].src], {encoding: 'utf8'});
						if(content)
							processScriptTag(scriptInputs[i], content);
					}
					else {
						var tempPath = path.join(directory, scriptInputs[i].src);
						if(fs.existsSync(tempPath)) {
							var tempString = fs.readFileSync(tempPath, 'utf8');
							if(tempString)
								processScriptTag(scriptInputs[i], tempString);
						}
					}
				}
			}
		}

		// find the main CC script and get its element
		var scriptIndex = 0;
		var dataIndex = 0;

		// get the lib.properties statement
		function processManifest(scriptElem, startIndex) {
			var scriptText = scriptElem.text;
			var libPropertiesStartIndex = startIndex;
			if(libPropertiesStartIndex > -1) {
				// find the beginBrace
				var libPropertiesEndIndex = scriptText.indexOf(';', libPropertiesStartIndex);
				var libPropOpenBraceIndex = scriptText.indexOf('{', libPropertiesStartIndex);
				if(libPropOpenBraceIndex > -1) {
					// find the closing brace
					var libPropCloseBraceIndex = findEndingBrace(scriptText, libPropOpenBraceIndex, "{}");
					if(libPropCloseBraceIndex > -1) {
						var libsPropsObj = eval("(" + scriptText.substring(libPropOpenBraceIndex, libPropCloseBraceIndex+1) + ")");

						if(libsPropsObj && libsPropsObj.hasOwnProperty("manifest")) {
							// go through manifest and remove unused SpriteSheets
							var prePost = "";
							var insertPre = "\n";

							function manItemToString(item) {
								var periodIndex = item.src.indexOf('.');
								if(periodIndex > -1) {
									var testExt = item.src.substring(periodIndex+1, item.src.length);
									if(	(testExt == 'jpg') ||
											(testExt == 'jpeg') ||
											(testExt == 'png') ||
											(testExt == 'gif') ||
											(testExt == 'bmp') ) {
										var variableName = "dataURI_" + dataIndex++;
										var imageAsData = convertImgToDataURI(item.src);
										var midFix = variableName + " = \"" + imageAsData + "\";\n";
										insertPre = insertPre + midFix;

										return ("{src: " + variableName + ", id: \"" + item.id + "\", type: \"image\"}");
									}
								}
								var itemKeys = Object.keys(item);
								return "{" + itemKeys.reduce( (tot, cur, curInd) => {
									var isString = typeof(item[cur]) == "string";
									return ((curInd > 0) ? tot + ", " : "") + cur + ":" + (isString ? "\"" : "") + item[cur] + (isString ? "\"" : "");
								}, "") + "}";
							}

							var newManifestString = libsPropsObj.manifest.reduce( (newManTotal, newManCurrent, newManCurInd) => {
								return ( (newManCurInd > 0) ? newManTotal + ",\n" : "" ) + "\t\t" + manItemToString(newManCurrent);
							}, "");

							// now get the full libProps string
							var libPropsString = scriptText.substring(libPropertiesStartIndex, libPropertiesEndIndex+1);

							// replace the manigest with our new one
							var newLibPropsString = libPropsString.replace(/(manifest\: \[)([\s.\S][^\]]*)(\])/, "$1\n" + newManifestString + "\n\t$3");

							var newScriptText = (insertPre
								+ scriptText.substring(0, libPropertiesStartIndex)
								+ newLibPropsString
								+ scriptText.substring(libPropertiesEndIndex+1, scriptText.length)
							);

							var par = scriptElem.parentNode;
							var elmnt = dom.window.document.createElement("script");

							var textnode = dom.window.document.createTextNode(newScriptText);
							elmnt.appendChild(textnode);
							par.replaceChild(elmnt, scriptElem);
						}
					}
				}
			}
		}

		while(scriptIndex < scriptInputs.length) {
			var libPropIndex = scriptInputs[scriptIndex].text.search(/\blib.properties =/);
			if(libPropIndex > -1) {
				processManifest(scriptInputs[scriptIndex], libPropIndex);
			}
			else {
				libPropIndex = scriptInputs[scriptIndex].text.search(/\blib.properties=/)
				if(libPropIndex > -1) {
					processManifest(scriptInputs[scriptIndex], libPropIndex);
				}
			}
			scriptIndex++;
		}

		scriptIndex = 0;
		var initScriptsElemIndex = -1;
		while(scriptIndex < scriptInputs.length) {
			if(scriptInputs[scriptIndex].text.search(/\bcanvas = document.getElementById\b/) > -1) {
				initScriptsElemIndex = scriptIndex;
				break;
			}
			scriptIndex++;
		}

		var insertResponsiveCode = "\t// begin modified responsive code\n" +
(excludeAspectCode ? "\t\t\t\t}\n" : "\t\t\t\t\tvar ASPECTLIMIT = " + aspectLimitFloat.toString() + "; // Don't set below or equal to zero!!!!\n\t\t\t\t\tvar aspect = ih/iw;\n\t\t\t\t\tsRatio = aspect > ASPECTLIMIT ? ASPECTLIMIT*iw/h : ( aspect < (1/ASPECTLIMIT) ? ASPECTLIMIT*ih/w : sRatio);\n\t\t\t\t}\n") + `			}
			var stretchingRatio = ` + stretchRatioFloat.toString() + `;
			canvas.width = Math.floor(iw*stretchingRatio);
			canvas.height = Math.floor(ih*stretchingRatio);
			canvas.style.width = dom_overlay_container.style.width = anim_container.style.width =  canvas.width+'px';
			canvas.style.height = anim_container.style.height = dom_overlay_container.style.height = canvas.height+'px';
			exportRoot.x = -(w*sRatio-iw) / (2 * sRatio);
			exportRoot.y = -(h*sRatio-ih) / (2 * sRatio);
			stage.scaleX = sRatio*stretchingRatio;
			stage.scaleY = sRatio*stretchingRatio;
 			// end modified responsive code
`

		if(initScriptsElemIndex > -1) {
			var sRatioIndex = scriptInputs[initScriptsElemIndex].text.search(/\bsRatio = Math.max\b/);
			if(sRatioIndex > -1) {
				// find the index to insert
				var insertResponsiveIndex = scriptInputs[initScriptsElemIndex].text.indexOf("\n", sRatioIndex) + 1;
				if(insertResponsiveIndex > -1) {
					var lastWIndex = scriptInputs[initScriptsElemIndex].text.indexOf("lastW = iw", insertResponsiveIndex);
					if(lastWIndex > -1) {
						var endResponsiveIndex = scriptInputs[initScriptsElemIndex].text.lastIndexOf("\n", lastWIndex) + 1;
						if(endResponsiveIndex > -1) {
							var newText = scriptInputs[initScriptsElemIndex].text.substring(0, insertResponsiveIndex) + insertResponsiveCode + scriptInputs[initScriptsElemIndex].text.substring(endResponsiveIndex);

							var par = scriptInputs[initScriptsElemIndex].parentNode;
							var elmnt = dom.window.document.createElement("script");

							var textnode = dom.window.document.createTextNode(newText);
							elmnt.appendChild(textnode);
							par.replaceChild(elmnt, scriptInputs[initScriptsElemIndex]);
						}
					}
				}
			}
		}

		// replace img with datauri
		if(inlineImages) {
			var imgInputs = dom.window.document.getElementsByTagName('img');
			for(var i = 0; i < imgInputs.length; i++) {
				if(imgInputs[i].hasAttribute('src'))
					processImgTag(imgInputs[i]);
			}
		}

		// fix preloader if exists
		if(fixPreloader) {
			var preloaderInput = dom.window.document.getElementById('_preload_div_');
			if(preloaderInput && (preloaderInput.tagName == 'DIV')) {
				preloaderInput.style.top = null;
				preloaderInput.style.left = null;
			}
		}

		var outputHtml;
		if(found) {
			outputHtml = "<!DOCTYPE html>\n" + dom.window.document.getElementsByTagName('html')[0].outerHTML;
		}
		else {
			outputHtml = dom.window.document.getElementsByTagName('head')[0].innerHTML + dom.window.document.getElementsByTagName('body')[0].innerHTML;
		}

		fs.writeFileSync(filepath, outputHtml);
//		fs.writeFileSync(filepath, dom.window.document.getElementsByTagName('html')[0].outerHTML);
		progressBar.setCompleted();

//		Trying to close progressBar while it hasn't finished will call aborted and in this case quit the app so don't call it

		// actually refactored code and closing seems okay
		progressBar.close();
		return true;
	}

	function run(inStretchRatio, inAspectLimit, inline, inlineImages, enableStageGL, fixPreloader, convRes, inFiles) {
		if((inFiles) && (inFiles.length > 0)) {
			var isWin = process.platform === "win32";
			directory = isWin ? inFiles[0].substring(0, inFiles[0].lastIndexOf("\\")) : inFiles[0].substring(0, inFiles[0].lastIndexOf("\/"));

			return loadHTML(null, fs.readFileSync(inFiles[0], 'utf8'), inFiles[0], inStretchRatio, inAspectLimit, inline, inlineImages, enableStageGL, fixPreloader, convRes);
		}
		else
			return false;
	}

	prompt({
		width: 400, height: 180, title: 'Stretching Ratio', label: 'Enter a Stretching Ratio. This will reduce or increase the resolution of the canvas which will stretch to fit the window.', value: '1.0', inputAttrs: {type: 'number '}, type: 'input', selectOptions: null
	})
	.then((inStretch) => {
		var inStretchFloat = parseFloat(inStretch);
		if(!isNaN(inStretchFloat) && (inStretchFloat > 0)) {
			return prompt({
				width: 400, height: 180, title: 'Aspect Limit', label: 'Enter an Aspect Ratio. This will create a limit that the canvas can stretch to fit. Enter \'0\' to Disable Aspect Limit', value: '2.0', inputAttrs: {type: 'number '}, type: 'input', selectOptions: null
			})
			.then((aspectInput) => {
				var aspectInputFloat = parseFloat(aspectInput);
				if(!isNaN(aspectInputFloat)  && (aspectInputFloat >= 0)) {
					var res = dialog.showMessageBox(null, {
						type: 'question',
						buttons: ['Cancel', 'Yes, please', 'No, thanks'],
						defaultId: 1,
						title: 'StageGL',
						message: 'Do you want to enable StageGL?'
					});

					if(res == 0)
						return Promise.reject("error");

					var inConvRes = dialog.showMessageBox(null, {
						type: 'question',
						buttons: ['Cancel', 'Yes, please', 'No, thanks'],
						defaultId: 1,
						title: 'CreateJS Version 1.0.0',
						message: 'Do you want to Convert for CreateJS v1.0.0 ?'
					});

					if(inConvRes == 0)
						return Promise.reject("error");

					var inlineRes = dialog.showMessageBox(null, {
						type: 'question',
						buttons: ['Cancel', 'Yes, please', 'No, thanks'],
						defaultId: 1,
						title: 'Inline Scripts',
						message: 'Shall I inline all scripts?'
					});

					if(inlineRes == 0)
						return Promise.reject("error");

					var imageRes = dialog.showMessageBox(null, {
						type: 'question',
						buttons: ['Cancel', 'Yes, please', 'No, thanks'],
						defaultId: 1,
						title: 'Inline Non Manifest Images',
						message: 'Shall I inline all img tags?'
					});

					if(imageRes == 0)
						return Promise.reject("error");

					var fixPreloaderDiv = dialog.showMessageBox(null, {
						type: 'question',
						buttons: ['Cancel', 'Yes, please', 'No, thanks'],
						defaultId: 1,
						title: 'Center Preloader Image',
						message: 'Shall I center the Preloader Image?'
					});

					if(fixPreloaderDiv == 0)
						return Promise.reject("error");

					return Promise.resolve({sRatio: inStretchFloat, aspectLimit: parseFloat(aspectInput), inline: (inlineRes == 1), inlineImages: (imageRes == 1), stageGL: (res == 1), fixPreloader: (fixPreloaderDiv == 1), convRes: (inConvRes == 1)});
				}
				else
					return Promise.reject("error");
			});
		}
		else
			return Promise.reject("error");
	})
	.then((inRes) => {
		if(run(inRes.sRatio, inRes.aspectLimit, inRes.inline, inRes.inlineImages, inRes.stageGL, inRes.fixPreloader, inRes.convRes, dialog.showOpenDialog({filters: [ {name: 'html', extensions: ['html', 'htm']}, {name: 'All Files', extensions: ['*']} ] }))) {
	//			createWindow();
			dialog.showMessageBox(null, {
				type: 'info', buttons: ['Dismiss'],
	    	title: 'Success',
	    	message: 'Inlined Scripts,\nConverted images to data-uri,\nAnd Converted Responsive code'
			}, app.quit);
		}
		else
			app.quit();
	})
	.catch((msg) => {
		app.quit();
	});

//	dialog.showOpenDialog({filters: [ {name: 'html', extensions: ['html', 'htm']}, {name: 'All Files', extensions: ['*']} ] }, run);
}

app.on('window-all-closed', e => e.preventDefault() );
app.on('ready', start);
//app.on('window-all-closed', app.quit);
