
(function () {

	/* 
	 * TODO:
	 * regex /elements/
	 * read number separate
	 * parse markup extensions
	 * skip hyperlinks in js code!
	 */

	/*^[-+]?(?:[0-9]{0,30}\\.)?[0-9]{1,30}(?:[Ee][-+]?[1-2]?[0-9])?$*/

	
	let elems = document.getElementsByClassName('code-highlight');

	for (let tag of elems)
		doHighlight(tag);

	function doHighlight(tag) {

		const delims = ' ,()[]{}\\*/:=;,+-<>';
		const keywords = /^(a(wait|sync|rguments)|b(reak)|c(onst|ase|atch|lass|ontinue)|do|de(lete|bugger|fault)|else|f(or|unction|alse|inally)|i(f|n)|n(ew|ull)|v(ar|oid)|let|switch|t(his|hrow|ry|ypeof|rue)|return|w(hile|ith)|yield)$/;
		const instr = /^(Array|Date|Infinity|Function|String|N(umber|aN)|Object|Math|is(Finite|PrototypeOf|NaN)|toString|undefined|alert|confirm|eval|valueOf|hasOwnProperty)$/;

		let lang = tag.getAttribute('data-lang');
		/*reset(tag, lang);*/
		let text = tag.textContent.trim();
		tag.innerHTML = '';
		let opts = {
			lang: lang,
			delims: delims,
			keywords: keywords,
			instr: instr
		};
		/*if (lang !== 'xml') return;*/
		tokenize(text, opts, function (type, token) {
			if (type !== 'ws')
				console.dir((type || '?') + '=> ' + token);
			if (type === 'ws' || type === 'delim')
				tag.appendChild(document.createTextNode(token));
			else {
				let elem = document.createElement('span');
				if (type === 'string')
					elem.style = "color:red";
				if (type === 'keyword')
					elem.style = "color:blue";
				if (type === 'instr')
					elem.style = "color:darkcyan";
				if (type === 'number')
					elem.style = "font-weight:bold;color:orange;";
				else if (type === 'comment')
					elem.style = "color:forestgreen";
				else if (type === 'cdata')
					elem.style = "color:#ccc";
				else if (type === 'tag')
					elem.style = "color:#CC00CC";
				else if (type === 'attrname')
					elem.style = "color:#00CCCC";
				else if (type === 'attrval')
					elem.style = "color:#A00000";
				elem.appendChild(document.createTextNode(token));
				tag.appendChild(elem);
			}
		});
	}

	function tokenize(text, opts, callback) {
		let ch = '.', /* first while */
			pos = 0,
			len = text.length,
			delims = opts.delims,
			keywords = opts.keywords,
			numbers = /^[-+]?\d*\.?\d*([eE][-+]\d*)?$/,
			instr = opts.instr,
			token = '';

		const TAB_REPLACE = '  '; /* 2 spaces */
		let xml = opts && opts.lang === 'xml';
	
		function nextChar() {
			if (pos >= len)
				return null;
			let ch = text[pos];
			pos += 1;
			return ch;
		}

		const backChar = () => { if (pos <= len) pos--; };
		const normalizeTab = ch => ch === '\t' ? TAB_REPLACE : ch;
		const isDelimiter = ch => delims.indexOf(ch) !== -1;
		const isStartString = ch => ch === '"' || ch === '`' || ch === "'";
		const isWhiteSpace = ch => ch === ' ' || ch === '\t' || ch === "\r" || ch === '\n';
		const isDigit = ch => ch >= '0' && ch <= '9';

		function readString(arg, toktype) {
			token += arg;
			let sc = nextChar();
			while (sc && sc !== arg) {
				token += normalizeTab(sc);
				sc = nextChar();
			}
			token += arg;
			addToken(toktype || 'string');
		}

		function readMultiLineComment() {
			token = '/*';
			let nch = nextChar();
			while (nch) {
				if (nch === '*') {
					token += nch;
					let nnch = nextChar();
					if (nnch === '/') {
						token += nnch;
						return addToken('comment');
					}
					else {
						backChar();
					}
				} else {
					token += normalizeTab(nch);
				}
				nch = nextChar();
			}
		}

		function readSingleLineComment() {
			while (ch && ch !== '\n' && ch !== '\r') {
				token += ch;
				ch = nextChar();
			}
			addToken('comment');
			backChar();
		}

		function readWhiteSpace(ch) {
			do {
				token += normalizeTab(ch);
				ch = nextChar();
			} while (ch && isWhiteSpace(ch));
			addToken('ws');
			backChar();
		}

		function skipWhiteSpace(ch) {
			while (ch && isWhiteSpace(ch)) {
				token += normalizeTab(ch);
				ch = nextChar();
			}
			addToken('ws');
			return ch;
		}

		function nextChars(n) {
			let str = '';
			for (let i = 0; i < n; i++)
				str += nextChar();
			return str;
		}

		function readName(ch, toktype) {
			do {
				token += ch;
				ch = nextChar();
			} while (ch && !isWhiteSpace(ch) && !isDelimiter(ch));
			addToken(toktype || 'name');
			if (ch)
				backChar();
		}

		function addToken(type) {
			if (!token)
				return;
			if (type === 'name') {
				if (keywords && keywords.test(token)) {
					type = 'keyword';
				} else if (numbers && numbers.test(token)) {
					type = 'number';
				} else if (instr && instr.test(token)) {
					type = 'instr';
				}
			}
			callback(type, token);
			token = '';
		}

		function readXmlAttribute(ch) {
			let close = false;
			while (ch && ch !== '/' && ch !== '>') {
				ch = skipWhiteSpace(ch);
				readName(ch, 'attrname');
				ch = nextChar();
				ch = skipWhiteSpace(ch);
				if (ch === '=') {
					token = ch;
					addToken('delim');
					ch = nextChar();
				}
				ch = skipWhiteSpace(ch);
				if (ch === '"') {
					readString(ch, 'attrval');
					ch = nextChar();
					ch = skipWhiteSpace(ch);
				}
			}
			ch = skipWhiteSpace(ch);
			if (ch === '/') {
				ch = nextChar();
				if (ch === '>') {
					token = '/>';
					addToken('tag');
					close = true;
					return close;
				}
				else
					backChar();
			} else if (ch === '>') {
				token = ch;
				addToken('tag');
				ch = nextChar();
				close = true;
			}
			ch = skipWhiteSpace(ch);
			backChar();
			return close;
		}

		function readXmlElement(ch) {
			token += ch;
			while (ch) {
				ch = nextChar();
				if (ch === '>') {
					token += ch;
					addToken('tag');
					return;
				}
				if (ch === '.')
					token += ch;
				else if (ch === '/')
					token += ch;
				else if (isWhiteSpace(ch)) {
					addToken('tag');
					if (readXmlAttribute(ch)) {
						return;
					}
				} else {
					token += ch;
				}
			}
		}

		function readXmlComment(ch) {
			token = '<!--';
			while (ch) {
				if (ch === '-') {
					let savePos = pos;
					let tail = nextChars(2);
					if (tail === '->') {
						token += '-->';
						addToken('comment');
						return;
					} else {
						pos = savePos;
					}
				}
				token += normalizeTab(ch);
				ch = nextChar();
			}
			addToken('comment');
		}

		function readCData(ch) {
			token = '<![CDATA[';
			while (ch) {
				if (ch === ']') {
					let savePos = pos;
					let tail = nextChars(2);
					if (tail === ']>') {
						token += ']]>';
						addToken('cdata');
						return;
					} else {
						pos = savePos;
					}
				}
				token += normalizeTab(ch);
				ch = nextChar();
			}
			addToken('cdata');
		}

		while (ch) {
			ch = nextChar();
			if (!ch)
				break;
			else if (isWhiteSpace(ch))
				readWhiteSpace(ch);
			else if (isStartString(ch))
				readString(ch);
			else if (ch === '/') {
				let nch = nextChar();
				if (nch === '/') {
					token += '/';
					readSingleLineComment();
					continue;
				}
				else if (nch === '*') {
					readMultiLineComment();
					continue;
				}
				else {
					backChar();
				}
				token = ch;
				addToken('delim');
			} else if (xml && ch === '<') {
				let savePos = pos; 
				let nstr = nextChars(3);
				if (nstr === '!--') {
					readXmlComment(nextChar(ch));
					ch = nextChar();
					ch = skipWhiteSpace(ch);
				} else if (nstr === '![C') {
					let tail = nextChars(5);
					if (tail === 'DATA[') {
						readCData(nextChar(ch));
						ch = nextChar();
						ch = skipWhiteSpace(ch);
					}
				} else {
					pos = savePos;
				}
				readXmlElement(ch);
			}
			else if (isDelimiter(ch)) {
				token = ch;
				addToken('delim');
			} else {
				readName(ch);
			}
		}
	}
})();