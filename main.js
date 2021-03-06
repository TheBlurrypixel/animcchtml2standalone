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

	function loadHTML(err, html_string, filepath, inStretchingRatio, inAspectLimit, inline, inlineURLs, makeDataURI, inlineImages, enableStageGL, fixPreloader) {
		if(!html_string) return false;

		var found = html_string.match(/<html>/g);

		var errorHappened = false;

		var stretchRatioFloat = parseFloat(inStretchingRatio);
		var aspectLimitFloat = parseFloat(inAspectLimit);
		var excludeAspectCode = (aspectLimitFloat == 0);

		var progressBar = new ProgressBar( {text: 'Processing file...', detail: 'Wait...'} );
		progressBar.on('completed', () => progressBar.detail = 'Task completed. Exiting...').on('aborted', () => app.quit());

		var fileContent = html_string.replace(/^\uFEFF/gm, '');

		const dom = new JSDOM(fileContent);

		var scriptInputs = dom.window.document.getElementsByTagName('script');

		function processScriptTag(element, data) {
			var par = element.parentNode;
//			var elmnt = dom.window.document.createElement("script");
			var elmnt = element.cloneNode();
			elmnt.removeAttribute("src");
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
				else if(extensionString.localeCompare("mp4")==0)
					imageAsData = "data:video/mp4;base64," + imageAsBase64;
				else if(extensionString.localeCompare("webm")==0)
					imageAsData = "data:video/webm;base64," + imageAsBase64;
			}

			return imageAsData;
		}

		function processImgTag(element) {
			var imageAsData = convertImgToDataURI(element.src);
			element.src = imageAsData;
		}

		// function processScriptSrc(elememt) {
		// 	// save a handle to the "this" pointer
		// 	var myElement = elememt;
		//
		// 	// this is an anonymous function
		// 	return function (err, data) {
		// 		var par = myElement.parentNode;
		// 		var elmnt = dom.window.document.createElement("script");
		// 		var textnode = dom.window.document.createTextNode('\n' + data + '\n');
		// 		elmnt.appendChild(textnode);
		// 		par.replaceChild(elmnt, myElement);
		// 	}
		// }

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

// 		var replacedCreateJS = false;
// 		if(enableStageGL || convRes) {
// 			var tempSIndex = 0;
// 			while(tempSIndex < scriptInputs.length) {
// 				if(scriptInputs[tempSIndex].hasAttribute('src')) {
// 					if(!replacedCreateJS && (scriptInputs[tempSIndex].src.search(/\bcreatejs\b.*\.js$/) > -1)) {
// 						scriptInputs[tempSIndex].src = "https://code.createjs.com/1.0.0/createjs.min.js";
// 						replacedCreateJS = true;
// 					}
// 				}
// 				else if(convRes) {
// //					var newText = scriptInputs[tempSIndex].text.replace(/Ticker.setFPS\((.+)\)/g, "Ticker.framerate = $1").replace(/\.getNumChildren\(\)/g, ".numChildren");
// 					var newText = scriptInputs[tempSIndex].text.replace(/Ticker.setFPS\((.+)\)/g, "Ticker.framerate = $1");
//
// 					var par = scriptInputs[tempSIndex].parentNode;
// //					var elmnt = dom.window.document.createElement("script");
// 					var elmnt = scriptInputs[tempSIndex].cloneNode();
// 					var textnode = dom.window.document.createTextNode(newText + '\n');
//
// 					elmnt.appendChild(textnode);
// 					par.replaceChild(elmnt, scriptInputs[tempSIndex]);
// 				}
// 				tempSIndex++;
// 			}
// 		}

		// convert to stageGL code
		if(enableStageGL) {
			var tempScriptIndex = 0;
			var stageGLScriptIndex = -1;
			var responsiveScriptIndex = -1;
			while(tempScriptIndex < scriptInputs.length) {
				if((stageGLScriptIndex < 0) && (scriptInputs[tempScriptIndex].text.search(/\blib\.Stage\s?=/gm) > -1))
					stageGLScriptIndex = tempScriptIndex;

				if((responsiveScriptIndex < 0) && (scriptInputs[tempScriptIndex].text.search(/\ban\.makeResponsive\s?=/gm) > -1))
					responsiveScriptIndex = tempScriptIndex;

				if((stageGLScriptIndex > -1) && (responsiveScriptIndex > -1))
					break;

				tempScriptIndex++;
			}

			if(stageGLScriptIndex > -1) {
				var newText = scriptInputs[stageGLScriptIndex].text.replace(/\bnew\screatejs\.Stage\b/gm, 'new createjs.StageGL').replace(/\bcreatejs\.Stage\.call\(this,\s?canvas\)\B/gm, 'createjs.StageGL.call(this, canvas, { antialias: true })');

				var par = scriptInputs[stageGLScriptIndex].parentNode;
				// var elmnt = dom.window.document.createElement("script");
				var elmnt = scriptInputs[stageGLScriptIndex].cloneNode();

				var textnode = dom.window.document.createTextNode(newText + '\n');
				elmnt.appendChild(textnode);
				par.replaceChild(elmnt, scriptInputs[stageGLScriptIndex]);
			}

			if(responsiveScriptIndex > -1) {
				var responsiveFuncIndex = scriptInputs[responsiveScriptIndex].text.search(/\ban\.makeResponsive\s?=/gm);
				var endingText = scriptInputs[responsiveScriptIndex].text.substring(responsiveFuncIndex);
				var stageUpdateIndex = endingText.search(/\bstage.update\(\)/gm);
				var newText = scriptInputs[responsiveScriptIndex].text.substring(0, responsiveFuncIndex+stageUpdateIndex) + "stage.updateViewport(canvas.width, canvas.height);\n\t\t\t" + scriptInputs[responsiveScriptIndex].text.substring(responsiveFuncIndex+stageUpdateIndex, scriptInputs[responsiveScriptIndex].text.length);

				var par = scriptInputs[responsiveScriptIndex].parentNode;
				// var elmnt = dom.window.document.createElement("script");
				var elmnt = scriptInputs[responsiveScriptIndex].cloneNode();

				var textnode = dom.window.document.createTextNode(newText + '\n');
				elmnt.appendChild(textnode);
				par.replaceChild(elmnt, scriptInputs[responsiveScriptIndex]);
			}
		}

		function getScriptString(src) {
			if(src.startsWith('http') && inlineURLs) {
				var content = require('child_process').execFileSync('curl', ['--silent', '-L', src], {encoding: 'utf8'});
				if(content)
					return content;
			}
			else {
				var tempPath = path.join(directory, src);
				if(fs.existsSync(tempPath)) {
					var tempString = fs.readFileSync(tempPath, 'utf8');
					if(tempString)
						return tempString;
				}
			}
			return null;
		}

		// replace linked libraries with inline scripts
		if(inline) {
			for(var i = 0; i < scriptInputs.length; i++) {
				if(scriptInputs[i].hasAttribute('src')) {
					if(scriptInputs[i].src.startsWith('http') && inlineURLs) {
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
						try {
							var libPropsString = "(" + scriptText.substring(libPropOpenBraceIndex, libPropCloseBraceIndex+1) + ")";
							libPropsString = libPropsString.replace(/[\t\n\r]+/gm, ' ');
							var libsPropsObj = eval(libPropsString);

							if(libsPropsObj && libsPropsObj.hasOwnProperty("manifest")) {
								// go through manifest and remove unused SpriteSheets
								var prePost = "";
								var insertPre = "\n";

								function manItemToString(item) {
									var periodIndex = item.src.lastIndexOf('.');
									if(periodIndex > -1) {
										var testExt = item.src.substring(periodIndex+1, item.src.length);
										if(	((testExt == 'jpg') ||
												(testExt == 'jpeg') ||
												(testExt == 'png') ||
												(testExt == 'gif') ||
												(testExt == 'bmp')) && makeDataURI) {
											var variableName = "dataURI_" + dataIndex++;
											var imageAsData = convertImgToDataURI(item.src);
											var midFix = variableName + " = \"" + imageAsData + "\";\n";
											insertPre = insertPre + midFix;

											return ("{src: " + variableName + ", id: \"" + item.id + "\", type: \"image\"}");
										}
										else if((testExt == 'js') && inline) {
											var scriptAsString = getScriptString(item.src);
											insertPre = insertPre + scriptAsString + "\n\n";
											return null;
										}
									}
									var itemKeys = Object.keys(item);
									return "{" + itemKeys.reduce( (tot, cur, curInd) => {
										var isString = typeof(item[cur]) == "string";
										return ((curInd > 0) ? tot + ", " : "") + cur + ":" + (isString ? "\"" : "") + item[cur] + (isString ? "\"" : "");
									}, "") + "}";
								}

								var newManifestString = libsPropsObj.manifest.reduce( (newManTotal, newManCurrent, newManCurInd) => {
									var manItemString = manItemToString(newManCurrent);
									if(!!manItemString)
										return ( (newManCurInd > 0) ? newManTotal + ",\n" : "" ) + "\t\t" + manItemString;
									return null;
								}, "");

								// now get the full libProps string
								var libPropsString = scriptText.substring(libPropertiesStartIndex, libPropertiesEndIndex+1);

								// replace the manigest with our new one
								if(!newManifestString)
									newManifestString = "";

								var newLibPropsString = libPropsString.replace(/\b(manifest\:\s\[)([\s.\S][^\]]*)(\])\B/gm, "$1\n" + newManifestString + "\n\t$3");

								var newScriptText = (insertPre
									+ scriptText.substring(0, libPropertiesStartIndex)
									+ newLibPropsString
									+ scriptText.substring(libPropertiesEndIndex+1, scriptText.length)
								);

								var par = scriptElem.parentNode;
								// var elmnt = dom.window.document.createElement("script");
								var elmnt = scriptElem.cloneNode();

								var textnode = dom.window.document.createTextNode(newScriptText);
								elmnt.appendChild(textnode);
								par.replaceChild(elmnt, scriptElem);
							}
						}
						catch(err) {
							console.log(err);
							return false;
						}
					}
				}
			}
			return true;
		}

		scriptInputs = dom.window.document.getElementsByTagName('script');
		if(inline || makeDataURI) {
			while(scriptIndex < scriptInputs.length) {
				var libPropIndex = scriptInputs[scriptIndex].text.search(/\blib\.properties\s?=/gm);
				if(libPropIndex > -1)
					errorHappened = !processManifest(scriptInputs[scriptIndex], libPropIndex);
				scriptIndex++;
			}
		}

		if(errorHappened) {
			progressBar.close();
			return false;
		}

		scriptIndex = 0;
		scriptInputs = dom.window.document.getElementsByTagName('script');
		var loaderScriptsElemIndex = -1;
		while(scriptIndex < scriptInputs.length) {
//			if(scriptInputs[scriptIndex].text.search(/\bcanvas = document.getElementById\b/) > -1) {
			if(scriptInputs[scriptIndex].text.search(/\bloader\.loadManifest\(lib\.properties\.manifest\)\B/gm) > -1) {
				loaderScriptsElemIndex = scriptIndex;
				break;
			}
			scriptIndex++;
		}
		if(loaderScriptsElemIndex > -1) {
			var newText = scriptInputs[loaderScriptsElemIndex].text.replace(/\bloader\.loadManifest\(lib\.properties\.manifest\)\B/gm, "if(lib.properties.manifest.length > 0)\n\t\tloader.loadManifest(lib.properties.manifest);\n\telse\n\t\tloader.dispatchEvent('complete')\n")
			var textnode = dom.window.document.createTextNode(newText);
			var par = scriptInputs[loaderScriptsElemIndex].parentNode;
			var elmnt = scriptInputs[loaderScriptsElemIndex].cloneNode();
			elmnt.appendChild(textnode);
			par.replaceChild(elmnt, scriptInputs[loaderScriptsElemIndex]);
		}

		scriptIndex = 0;
		scriptInputs = dom.window.document.getElementsByTagName('script');
		var initScriptsElemIndex = -1;
		while(scriptIndex < scriptInputs.length) {
//			if(scriptInputs[scriptIndex].text.search(/\bcanvas = document.getElementById\b/) > -1) {
			if(scriptInputs[scriptIndex].text.search(/\ban\.makeResponsive\s?=/gm) > -1) {
				initScriptsElemIndex = scriptIndex;
				break;
			}
			scriptIndex++;
		}

		var insertResponsiveCode = "\t// begin modified responsive code\n" +
(excludeAspectCode ? "\t\t\t\t}\n" : "\t\t\t\t\tvar ASPECTLIMIT = " + aspectLimitFloat.toString() + "; // Don't set below or equal to zero!!!!\n\t\t\t\t\tvar aspect = ih/iw;\n\t\t\t\t\tsRatio = aspect > ASPECTLIMIT ? ASPECTLIMIT*iw/h : ( aspect < (1/ASPECTLIMIT) ? ASPECTLIMIT*ih/w : sRatio);\n\t\t\t\t}\n") + `			}
			var stretchingRatio = ` + stretchRatioFloat.toString() + `;
			domContainers[0].width = Math.floor(iw*stretchingRatio);
			domContainers[0].height = Math.floor(ih*stretchingRatio);
			domContainers.forEach(function(container) {
				container.style.width = domContainers[0].width + 'px';
				container.style.height = domContainers[0].height + 'px';
			});
			exportRoot.x = -(w*sRatio-iw) / (2 * sRatio);
			exportRoot.y = -(h*sRatio-ih) / (2 * sRatio);
			stage.scaleX = sRatio*stretchingRatio;
			stage.scaleY = sRatio*stretchingRatio;
 			// end modified responsive code
`

		if(initScriptsElemIndex > -1) {
			var sRatioIndex = scriptInputs[initScriptsElemIndex].text.search(/\bsRatio\s?=\s?Math\.max\b/gm);
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
							// var elmnt = dom.window.document.createElement("script");
							var elmnt = scriptInputs[initScriptsElemIndex].cloneNode();

							var textnode = dom.window.document.createTextNode(newText);
							elmnt.appendChild(textnode);
							par.replaceChild(elmnt, scriptInputs[initScriptsElemIndex]);
						}
					}
				}
			}
		}

		// replace img with datauri
		scriptInputs = dom.window.document.getElementsByTagName('script');
		if(inlineImages) {
			var imgInputs = dom.window.document.getElementsByTagName('img');
			for(var i = 0; i < imgInputs.length; i++) {
				if(imgInputs[i].hasAttribute('src'))
					processImgTag(imgInputs[i]);
			}

			// get all the script tags that instance a video
			var scriptInputsArr = [...scriptInputs];
			var scriptInputsWithVidArray = scriptInputsArr.filter( item => item.text.search(/\bnew\slib\.an_Video\(\B/gm) > -1 );

			scriptInputsWithVidArray.forEach( (script) => {
				var insertPre = "\n";

				var scriptString = script.text;
				var searchIndex = 0;
				var newVidIndex = scriptString.substring(searchIndex).search(/\bnew\slib\.an_Video\(\B/gm);
				while(newVidIndex > -1) {
					var propString = scriptString.substring(newVidIndex);
					var startBraceIndex = propString.indexOf('{');
					 if(startBraceIndex > -1) {
					 	var endBraceIndex = findEndingBrace(propString, startBraceIndex);
					 	if(endBraceIndex > -1) {
							var videoPropsString = "(" + propString.substring(startBraceIndex, endBraceIndex+1) + ")";
							videoPropsString = videoPropsString.replace(/[\t\n\r]+/gm, ' ');
							var videoPropsObj = eval(videoPropsString);
							if(videoPropsObj && videoPropsObj.src) {

								var variableName = "dataURI_" + dataIndex++;
								var videoAsData = convertImgToDataURI(videoPropsObj.src);
								var midFix = variableName + " = \"" + videoAsData + "\";\n";
								insertPre = insertPre + midFix;

								var newVideoPropsString = "new lib.an_Video(" + videoPropsString.replace(/(?:\'src\'\:)([^,]*)(?:,)/gm, "'src':" + variableName + ",");
								var newScriptString = scriptString.substring(0, newVidIndex) + newVideoPropsString + scriptString.substring(newVidIndex+endBraceIndex+1);
								endBraceIndex = newVideoPropsString.length-1;
								scriptString = newScriptString;
//								console.log(scriptString);
							}
							searchIndex = newVidIndex+endBraceIndex+1;
//							console.log(scriptString.substring(searchIndex));
							var subVidIndex = scriptString.substring(searchIndex).search(/\bnew\slib\.an_Video\(\b/gm);
							newVidIndex = (subVidIndex > -1) ? (searchIndex + subVidIndex) : -1;
					 	}
						else
							break;
					 }
					else
						break;
				}

				var newScriptText = insertPre + scriptString;

				var par = script.parentNode;
				var elmnt = script.cloneNode();

				var textnode = dom.window.document.createTextNode(newScriptText);
				elmnt.appendChild(textnode);
				par.replaceChild(elmnt, script);
			});
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

	function run(inStretchRatio, inAspectLimit, inline, inlineURLs, makeDataURI, inlineImages, enableStageGL, fixPreloader, inFiles) {
		if((inFiles) && (inFiles.length > 0)) {
			var isWin = process.platform === "win32";
			directory = isWin ? inFiles[0].substring(0, inFiles[0].lastIndexOf("\\")) : inFiles[0].substring(0, inFiles[0].lastIndexOf("\/"));

			return loadHTML(null, fs.readFileSync(inFiles[0], 'utf8'), inFiles[0], inStretchRatio, inAspectLimit, inline, inlineURLs, makeDataURI, inlineImages, enableStageGL, fixPreloader);
		}
		else
			return false;
	}

	prompt({
		width: 400, height: 220, title: 'Stretching Ratio', label: 'Enter a Stretching Ratio. This will reduce or increase the resolution of the canvas which will stretch to fit the window.', value: '1.0', inputAttrs: {type: 'number '}, type: 'input', selectOptions: null
	})
	.then((inStretch) => {
		var inStretchFloat = parseFloat(inStretch);
		if(!isNaN(inStretchFloat) && (inStretchFloat > 0)) {
			return prompt({
				width: 400, height: 220, title: 'Aspect Limit', label: 'Enter an Aspect Ratio. This will create a limit that the canvas can stretch to fit. Enter \'0\' to Disable Aspect Limit', value: '2.0', inputAttrs: {type: 'number '}, type: 'input', selectOptions: null
			})
			.then((aspectInput) => {
				var aspectInputFloat = parseFloat(aspectInput);
				if(!isNaN(aspectInputFloat)  && (aspectInputFloat >= 0)) {
					var res = dialog.showMessageBoxSync(null, {
						type: 'question',
						buttons: ['Cancel', 'Yes, please', 'No, thanks'],
						defaultId: 1,
						title: 'StageGL',
						message: 'Do you want to enable StageGL?'
					});

					if(res == 0)
						return Promise.reject("error");

					var inlineRes = dialog.showMessageBoxSync(null, {
						type: 'question',
						buttons: ['Cancel', 'Yes, please', 'No, thanks'],
						defaultId: 1,
						title: 'Inline Scripts',
						message: 'Shall I inline all scripts including manifested?'
					});

					if(inlineRes == 0)
						return Promise.reject("error");

					var inlineURLs = 2;
					if(inlineRes == 1) {
						inlineURLs = dialog.showMessageBoxSync(null, {
							type: 'question',
							buttons: ['Cancel', 'Yes, please', 'No, thanks'],
							defaultId: 1,
							title: 'Inline External URLs',
							message: 'Shall I also inline all http sourced scripts?'
						});
					}

					if(inlineURLs == 0)
						return Promise.reject("error");

					var makeDataURI = dialog.showMessageBoxSync(null, {
						type: 'question',
						buttons: ['Cancel', 'Yes, please', 'No, thanks'],
						defaultId: 1,
						title: 'Inline Manifest Images',
						message: 'Shall I inline all Manifest Images?'
					});

					if(makeDataURI == 0)
						return Promise.reject("error");

					var imageRes = dialog.showMessageBoxSync(null, {
						type: 'question',
						buttons: ['Cancel', 'Yes, please', 'No, thanks'],
						defaultId: 1,
						title: 'Inline Non Manifest Images and Video',
						message: 'Shall I inline all img tags and video components?'
					});

					if(imageRes == 0)
						return Promise.reject("error");

					var fixPreloaderDiv = dialog.showMessageBoxSync(null, {
						type: 'question',
						buttons: ['Cancel', 'Yes, please', 'No, thanks'],
						defaultId: 1,
						title: 'Center Preloader Image',
						message: 'Shall I center the Preloader Image?'
					});

					if(fixPreloaderDiv == 0)
						return Promise.reject("error");

					return Promise.resolve({sRatio: inStretchFloat, aspectLimit: parseFloat(aspectInput), inline: (inlineRes == 1), inlineURLs: (inlineURLs == 1), makeDataURI: (makeDataURI == 1), inlineImages: (imageRes == 1), stageGL: (res == 1), fixPreloader: (fixPreloaderDiv == 1)});
				}
				else
					return Promise.reject("error");
			});
		}
		else
			return Promise.reject("error");
	})
	.then((inRes) => {
		if(run(inRes.sRatio, inRes.aspectLimit, inRes.inline, inRes.inlineURLs, inRes.makeDataURI, inRes.inlineImages, inRes.stageGL, inRes.fixPreloader, dialog.showOpenDialogSync({filters: [ {name: 'html', extensions: ['html', 'htm']}, {name: 'All Files', extensions: ['*']} ] }) )) {
	//			createWindow();
			dialog.showMessageBoxSync(null, {
				type: 'info', buttons: ['Dismiss'],
	    	title: 'Success',
	    	message: 'Inlined Scripts,\nConverted images to data-uri,\nAnd Converted Responsive code'
			}).then(() => {
				app.quit();
			})
		}
		else {
			dialog.showMessageBoxSync(null, {
				type: 'info', buttons: ['Dismiss'],
	    	title: 'Abort',
	    	message: 'A fatal error or cancellation occurred.\nConversion aborted.'
			}).then(() => {
				app.quit();
			})
			app.quit();
		}
	})
	.catch((msg) => {
		app.quit();
	});

//	dialog.showOpenDialog({filters: [ {name: 'html', extensions: ['html', 'htm']}, {name: 'All Files', extensions: ['*']} ] }, run);
}

app.on('window-all-closed', e => e.preventDefault() );
app.on('ready', start);
//app.on('window-all-closed', app.quit);
