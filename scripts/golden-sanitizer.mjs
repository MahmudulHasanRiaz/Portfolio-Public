// Golden tests for the dual-format body renderer (TipTap upgrade).
// Mirrors packages/ui/test-legacy-html.mjs in Portfolio-V2: the same
// hostile + normal cases must behave identically on both sides.
// Run: node scripts/golden-sanitizer.mjs  (Node 24+ type-strips detail.ts)
import {
	parseRichBody,
	parseBodyBlocks,
	parseHtmlBlocks,
	isHtmlBody,
	isSafeUrl,
} from "../src/lib/detail.ts";

let passed = 0;
let failed = 0;
function check(name, cond, extra) {
	if (cond) {
		passed += 1;
		console.log(`  ok ${name}`);
	} else {
		failed += 1;
		console.log(`  FAIL ${name}${extra !== undefined ? ` — ${JSON.stringify(extra)}` : ""}`);
	}
}
const json = (v) => JSON.stringify(v);

const NORMAL_HTML =
	"<h2>What we built</h2><p>EcoMate is a <strong>single-tenant</strong> ERP with " +
	"<a href=\"https://erp.jannatfashionlive.com\">live deployments</a>.</p>" +
	"<ul><li>Orders</li><li><em>Inventory</em> and <u>payroll</u></li></ul>" +
	"<blockquote>Built for real shops.</blockquote>";

const LEGACY_BODY =
	"## What we built\n\nEcoMate is a single-tenant ERP.\n\nIt serves real shops every day.";

// 1. Normal HTML: headings, bold, link, list, quote all survive typed.
{
	const blocks = parseRichBody(NORMAL_HTML);
	check("html: 4 blocks (h2, p, ul, quote)", blocks.length === 4, blocks);
	check("html: h2 text", blocks[0]?.kind === "h2" && blocks[0]?.text === "What we built", blocks[0]);
	const p = blocks[1];
	check("html: p has bold run", p?.kind === "p" && p.inline?.some((n) => n.bold && n.text === "single-tenant"), p?.inline);
	check(
		"html: p has https link run",
		p?.inline?.some((n) => n.href === "https://erp.jannatfashionlive.com" && n.text === "live deployments"),
		p?.inline,
	);
	const ul = blocks[2];
	check(
		"html: ul has 2 items, second has em + u runs",
		ul?.kind === "ul" &&
			ul.items?.length === 2 &&
			ul.items[1]?.some((n) => n.italic && n.text === "Inventory") &&
			ul.items[1]?.some((n) => n.underline && n.text === "payroll"),
		ul?.items,
	);
	check("html: quote block", blocks[3]?.kind === "quote" && blocks[3]?.text === "Built for real shops.", blocks[3]);
}

// 2. Legacy `## ` row: routed to the untouched legacy parser, identical output.
{
	const rich = parseRichBody(LEGACY_BODY);
	const legacy = parseBodyBlocks(LEGACY_BODY);
	check("legacy: parseRichBody === parseBodyBlocks", json(rich) === json(legacy), rich);
	check(
		"legacy: h2 + 1 paragraph (legacy parser merges consecutive " +
			"paragraph chunks into one block — pre-existing quirk, " +
			"parseBodyBlocks untouched)",
		rich.length === 2 &&
			rich[0]?.kind === "h2" &&
			rich[1]?.kind === "p" &&
			rich[1]?.text ===
				"EcoMate is a single-tenant ERP. It serves real shops every day." &&
			rich.every((b) => b.inline === undefined),
		rich,
	);
	check("legacy: isHtmlBody false", isHtmlBody(LEGACY_BODY) === false);
}

// 3. Hostile: <script> is dropped entirely — tag AND content.
{
	const blocks = parseRichBody('<p>Safe</p><script>alert("xss")</script><p>After</p>');
	check(
		"hostile: script tag + content gone",
		blocks.length === 2 && blocks.every((b) => b.text === "Safe" || b.text === "After"),
		blocks,
	);
	check("hostile: no script in serialized output", !json(blocks).includes("script") && !json(blocks).includes("alert"));
}

// 4. Hostile: javascript: link href is dropped, text stays plain.
{
	const blocks = parseRichBody('<p>Click <a href="javascript:alert(1)">here</a> now.</p>');
	const runs = blocks[0]?.inline ?? [];
	check(
		"hostile: javascript: href dropped, text kept as one plain run",
		runs.length === 1 && runs[0]?.text === "Click here now." && runs[0]?.href === undefined,
		runs,
	);
	check("hostile: no javascript: in output", !json(blocks).includes("javascript:"));
}

// 5. Hostile: onerror / onclick attributes never survive.
{
	const blocks = parseRichBody('<p>Pic</p><img src="https://example.com/x.png" onerror="alert(1)" alt="x">');
	check(
		"hostile: img kept with src+alt only",
		blocks.length === 2 && blocks[1]?.kind === "img" && blocks[1]?.src === "https://example.com/x.png",
		blocks,
	);
	check("hostile: no onerror/onclick in output", !/onerror|onclick/i.test(json(blocks)));
	const div = parseRichBody('<div onclick="alert(1)">Keep this text</div>');
	check("hostile: disallowed div stripped, inner text kept", div.length === 1 && div[0]?.text === "Keep this text", div);
}

// 6. Hostile: <style> content dropped; iframe dropped entirely.
{
	const styled = parseRichBody("<style>body{display:none}</style><p>Visible</p>");
	check("hostile: style content dropped", styled.length === 1 && styled[0]?.text === "Visible", styled);
	const framed = parseRichBody('<p>Before</p><iframe src="https://evil.example"></iframe><p>After</p>');
	check("hostile: iframe dropped", framed.length === 2 && !json(framed).includes("iframe"), framed);
}

// 7. URL allowlist: relative + https pass; protocol-relative, data:, ftp: fail.
{
	check("url: https ok", isSafeUrl("https://example.com/a?b=1"));
	check("url: relative ok", isSafeUrl("/projects/ecomate") && isSafeUrl("./x") && isSafeUrl("#top"));
	check("url: protocol-relative rejected", !isSafeUrl("//evil.example/x"));
	check("url: data: rejected", !isSafeUrl("data:image/svg+xml,<svg onload=alert(1)>"));
	check("url: javascript: rejected", !isSafeUrl("JaVaScRiPt:alert(1)"));
	const badImg = parseRichBody('<img src="data:image/png;base64,AAA" alt="x">');
	check("hostile: data: img src dropped", badImg.length === 0, badImg);
	const badLink = parseRichBody('<p><a href="//evil.example">x</a></p>');
	check("hostile: protocol-relative link dropped", (badLink[0]?.inline ?? []).every((n) => n.href === undefined), badLink[0]?.inline);
}

// 8. Nested marks + nested list flattening.
{
	const blocks = parseRichBody("<p><a href=\"/projects/ecomate\"><strong>Bold link</strong></a></p>");
	const run = blocks[0]?.inline?.[0];
	check("nested: bold link run carries both marks", run?.bold === true && run?.href === "/projects/ecomate", run);
	const nested = parseRichBody("<ul><li>One<ul><li>Nested</li></ul></li><li>Two</li></ul>");
	check(
		"nested: list flattened, no item lost",
		nested.length === 1 && nested[0]?.items?.length === 3 && nested[0]?.items?.[1]?.[0]?.text === "Nested",
		nested[0]?.items,
	);
}

// 9. Prose with `<` is NOT treated as HTML.
{
	check("prose: 'a < b' stays legacy", isHtmlBody("a < b and c > d") === false);
	check("prose: '<3' stays legacy", isHtmlBody("We <3 our clients") === false);
	const blocks = parseRichBody("Price < 1000 taka, quality > expected.");
	check("prose: renders as one paragraph", blocks.length === 1 && blocks[0]?.kind === "p", blocks);
}

// 10. Edge cases: empty, whitespace-only, unclosed tags, entities.
{
	check("edge: empty -> []", parseRichBody("").length === 0 && parseRichBody(null).length === 0);
	check("edge: unclosed <p> still renders", parseRichBody("<p>Unclosed").length === 1);
	const ent = parseRichBody("<p>Fish &amp; Chips &lt;3</p>");
	check("edge: entities decoded to text", ent[0]?.text === "Fish & Chips <3", ent[0]?.text);
	check("edge: empty <p></p> skipped", parseRichBody("<p></p><p>Real</p>").length === 1);
}

// 11. Direct sanitizer entry: parseHtmlBlocks never emits raw HTML strings.
{
	const blocks = parseHtmlBlocks('<p onclick="x()">A</p><script>bad()</script>');
	check(
		"direct: no tags or handlers in serialized output",
		!/<(script|style|iframe|div|p|a)\b/i.test(json(blocks)) && !/onclick|bad\(\)/i.test(json(blocks)),
		blocks,
	);
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
