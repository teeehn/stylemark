const path = require('path');
const fs = require('fs');
const globby = require('globby');
const flatten = require('lodash/flatten');
const matter = require('gray-matter');
const unified = require('unified');
const markdownParser = require('remark-parse');
const codeBlockParser = require('remark-code-blocks');
const remark2rehype = require('remark-rehype');
const htmlRenderer = require('rehype-stringify');

(async function() {
	try {
		const globs = process.argv[2];
		const filepaths = await getFilepaths(globs);
		const docs = flatten(filepaths.map(filepath => {
			const contents = extractDocContents(filepath);
			const docs = contents.map(content => docFactory(content, filepath));
			return docs;
		}));
		docs.forEach(writeDoc);
	}
	catch (error) {
		console.log(error);
	}
})();

async function getFilepaths(globs) {
	const filepaths = await globby(globs);
	return filepaths.map(filepath => path.resolve(filepath));
}

function extractDocContents(filepath) {
	const fileContent = fs.readFileSync(filepath, 'utf8');
	const isMarkdown = filepath.endsWith('.md') || filepath.endsWith('.markdown');
	return isMarkdown ? [fileContent] : getDocBlocks(fileContent);
}

function getDocBlocks(fileContent) {
	const docBlocks = fileContent.match(/\/\*[\s\S]+?\*\//g);  // Extracts whole docblock including comment tags: /* … */
	return docBlocks.map(docBlock => docBlock
		.replace(/^\/[*]+\s*/, '')  // Removes opening comment tag: /*
		.replace(/\*\/$/, '')  // Removes closing comment tag: */
	);
}

function docFactory(markdown, filepath) {
	const meta = matter(markdown).data;
	const id = meta.category + '-' + meta.name;
	const rendered = unified()
		.use(markdownParser)
		.use(codeBlockParser)
		.use(remark2rehype)
		.use(htmlRenderer)
		.processSync(markdown);
	const blocks = rendered.data.codeblocks;
	const html = rendered.toString();
	return { id, filepath, meta, markdown, html, blocks };
}

function writeDoc(doc) {
	console.log(doc);
}
