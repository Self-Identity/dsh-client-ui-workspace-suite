    /* ============================== markdown =============================== */

    /**
     * A small, dependency-free Markdown renderer for workspace README files.
     *
     * The host's `MarkdownText` primitive is not part of this client build, which is
     * exactly why the README rendered as preformatted text. This renders the subset a
     * README actually uses: headings, fenced code, lists (nested by indent), tables,
     * blockquotes, rules, and inline code / bold / italic / strike / links.
     *
     * Everything is produced as React elements - no HTML string is ever injected, so a
     * README cannot execute anything.
     */

    const MARKDOWN_INLINE = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(__[^_\n]+__)|(~~[^~\n]+~~)|(\[[^\]\n]*\]\([^)\s]+\))|(\*[^*\n]+\*)|(_[^_\n]+_)/g

    /** True for links this renderer is willing to turn into a clickable anchor. */
    function isSafeHref(url) {
      return /^(https?:\/\/|mailto:|#)/i.test(url)
    }

    /** Inline markdown to React nodes (plain strings plus elements). */
    function markdownInline(text, keyPrefix) {
      const source = String(text === undefined || text === null ? '' : text)
      const prefix = keyPrefix === undefined ? 'i' : keyPrefix
      const out = []
      // A fresh global regex per call: the matcher recurses for bold/italic/link text,
      // and a shared `lastIndex` between the outer and inner scans re-matched the same
      // token forever (an OOM, and a frozen GUI in the real app).
      const pattern = new RegExp(MARKDOWN_INLINE.source, 'g')
      let cursor = 0
      let index = 0
      let match = pattern.exec(source)
      while (match !== null) {
        if (match.index > cursor) out.push(source.slice(cursor, match.index))
        const token = match[0]
        const key = prefix + ':' + String(index)
        index += 1
        if (token.charAt(0) === '`') {
          out.push(E('code', { key }, token.slice(1, -1)))
        } else if (token.slice(0, 2) === '**' || token.slice(0, 2) === '__') {
          out.push(E('strong', { key }, markdownInline(token.slice(2, -2), key)))
        } else if (token.slice(0, 2) === '~~') {
          out.push(E('del', { key }, markdownInline(token.slice(2, -2), key)))
        } else if (token.charAt(0) === '[') {
          const close = token.indexOf('](')
          const label = token.slice(1, close)
          const url = token.slice(close + 2, -1)
          out.push(isSafeHref(url)
            ? E('a', { key, href: url, target: '_blank', rel: 'noreferrer noopener' }, markdownInline(label, key))
            : E('span', { key }, token))
        } else {
          out.push(E('em', { key }, markdownInline(token.slice(1, -1), key)))
        }
        cursor = match.index + token.length
        match = pattern.exec(source)
      }
      if (cursor < source.length) out.push(source.slice(cursor))
      return out
    }

    /** Split Markdown source into block descriptors. */
    function markdownBlocks(source) {
      const lines = String(source === undefined || source === null ? '' : source)
        .replace(/\r\n?/g, '\n')
        .split('\n')
      const blocks = []
      const fenceOf = (line) => /^ {0,3}(```|~~~)/.exec(line)
      const ruleOf = (line) => /^ {0,3}((\*[ \t]*){3,}|(-[ \t]*){3,}|(_[ \t]*){3,})$/.test(line)
      const headingOf = (line) => /^ {0,3}(#{1,6})[ \t]+(.*?)[ \t]*$/.exec(line)
      const itemOf = (line) => /^(\s*)([-*+]|\d+[.)])[ \t]+(.*)$/.exec(line)
      const quoteOf = (line) => /^ {0,3}>/.test(line)
      const cellsOf = (line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim())
      const separatorOf = (line) => /^ {0,3}\|?[ \t]*:?-{2,}:?[ \t]*(\|[ \t]*:?-{2,}:?[ \t]*)*\|?[ \t]*$/.test(line)
      let index = 0
      while (index < lines.length) {
        const line = lines[index]
        if (/^\s*$/.test(line)) {
          index += 1
          continue
        }
        const fence = fenceOf(line)
        if (fence !== null) {
          const marker = fence[1]
          const lang = line.trim().slice(3).trim()
          const body = []
          index += 1
          while (index < lines.length && !new RegExp('^ {0,3}' + marker).test(lines[index])) {
            body.push(lines[index])
            index += 1
          }
          if (index < lines.length) index += 1
          blocks.push({ kind: 'code', lang, text: body.join('\n') })
          continue
        }
        const heading = headingOf(line)
        if (heading !== null) {
          blocks.push({ kind: 'heading', level: heading[1].length, text: heading[2] })
          index += 1
          continue
        }
        if (ruleOf(line)) {
          blocks.push({ kind: 'rule' })
          index += 1
          continue
        }
        if (quoteOf(line)) {
          const body = []
          while (index < lines.length && quoteOf(lines[index])) {
            body.push(lines[index].replace(/^ {0,3}> ?/, ''))
            index += 1
          }
          blocks.push({ kind: 'quote', lines: body })
          continue
        }
        if (line.indexOf('|') !== -1 && index + 1 < lines.length && separatorOf(lines[index + 1])) {
          const head = cellsOf(line)
          const rows = []
          index += 2
          while (index < lines.length && lines[index].indexOf('|') !== -1 && !/^\s*$/.test(lines[index])) {
            rows.push(cellsOf(lines[index]))
            index += 1
          }
          blocks.push({ kind: 'table', head, rows })
          continue
        }
        const firstItem = itemOf(line)
        if (firstItem !== null) {
          const ordered = /^\d/.test(firstItem[2])
          const items = []
          while (index < lines.length) {
            const next = itemOf(lines[index])
            if (next === null) break
            items.push({
              indent: Math.floor(next[1].replace(/\t/g, '  ').length / 2),
              text: next[3],
            })
            index += 1
          }
          blocks.push({ kind: 'list', ordered, items })
          continue
        }
        const body = []
        while (index < lines.length) {
          const text = lines[index]
          if (/^\s*$/.test(text)) break
          if (fenceOf(text) !== null || headingOf(text) !== null || ruleOf(text) || quoteOf(text) || itemOf(text) !== null) break
          body.push(text.trim())
          index += 1
        }
        if (body.length === 0) index += 1
        else blocks.push({ kind: 'para', text: body.join('\n') })
      }
      return blocks
    }

    /** Render Markdown source to React nodes. */
    function markdownNodes(source) {
      const blocks = markdownBlocks(source)
      const out = []
      blocks.forEach((block, blockIndex) => {
        const key = 'b' + String(blockIndex)
        if (block.kind === 'heading') {
          const level = Math.min(6, Math.max(1, block.level))
          out.push(E('h' + String(level), { key, className: 'dws-mdHeading' }, markdownInline(block.text, key)))
        } else if (block.kind === 'code') {
          out.push(E('pre', { key, className: 'dws-mdCode' },
            E('code', null, block.text)))
        } else if (block.kind === 'rule') {
          out.push(E('hr', { key, className: 'dws-mdRule' }))
        } else if (block.kind === 'quote') {
          out.push(E('blockquote', { key, className: 'dws-mdQuote' },
            markdownNodes(block.lines.join('\n'))))
        } else if (block.kind === 'list') {
          out.push(E(block.ordered ? 'ol' : 'ul', { key, className: 'dws-mdList' },
            block.items.map((item, itemIndex) => E('li', {
              key: key + ':' + String(itemIndex),
              style: item.indent > 0 ? { marginInlineStart: String(Math.min(6, item.indent) * 14) + 'px' } : undefined,
            }, markdownInline(item.text, key + ':' + String(itemIndex))))))
        } else if (block.kind === 'table') {
          out.push(E('table', { key, className: 'dws-mdTable' }, [
            E('thead', { key: 'head' }, E('tr', null, block.head.map((cell, cellIndex) =>
              E('th', { key: 'h' + String(cellIndex) }, markdownInline(cell, key + ':h' + String(cellIndex)))))),
            E('tbody', { key: 'body' }, block.rows.map((row, rowIndex) =>
              E('tr', { key: 'r' + String(rowIndex) }, row.map((cell, cellIndex) =>
                E('td', { key: 'c' + String(cellIndex) }, markdownInline(cell, key + ':r' + String(rowIndex) + ':' + String(cellIndex))))))),
          ]))
        } else {
          out.push(E('p', { key, className: 'dws-mdPara' }, markdownInline(block.text, key)))
        }
      })
      return out
    }

