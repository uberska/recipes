#!/usr/bin/env node

const fs = require('fs-extra');
const globby = require('globby');
const path = require('path');

const inputDir = path.join(__dirname, '../pepperplate_recipes');
const outputDir = path.join(__dirname, '../pepperplate_recipes_json');

const knownTags = new Set([
	'Title',
	'Description',
	'Source',
	'Original URL',
	'Yield',
	'Active',
	'Total',
	'Categories',
	'Ingredients',
	'Instructions',
	'Notes',
	'Image',
	'Course',
	'Cuisine',
	'Dietary Consideration',
	'Recipe Type',
	'Servings',
]);

const findNextBlankLineIndex = (lines, currentIndex) => {
	for (let index = currentIndex; index < lines.length; index++) {
		if (lines[index].trim() === '' &&
				(index + 1 === lines.length || !lines[index + 1].trim().startsWith('['))) {
			return index;
		}
	}

	throw new Error('Blank line not found.');
};

const changeExtensionToJson = (file) => {
	return file.substr(0, file.lastIndexOf(".")) + ".json";
};

const main = async () => {
	console.log('');

	console.log(`Clearing output dir: ${outputDir}`);
	fs.removeSync(outputDir);
	fs.ensureDirSync(outputDir);

	console.log('Processing recipes.');
	const recipePaths = [];
	const paths = await globby(`${inputDir}/*`);
	paths.forEach((recipePath) => {
		console.log(recipePath);
		const contents = fs.readFileSync(recipePath, {encoding: 'UTF-8'}).split('\r\n');

		const obj = {};

		for (let index = 0; index < contents.length; index++) {
			const line = contents[index];

			if (line.trim() === '') {
				continue;
			}

			const colonIndex = line.indexOf(':');

			const tag = line.substring(0, colonIndex);

			if (!knownTags.has(tag)) {
				throw new Error(`Unknown tag: '${tag}'`);
			}

			if (['Ingredients', 'Instructions'].includes(tag)) {
				const endIndex = findNextBlankLineIndex(contents, index);
				obj[tag] = contents.slice(index + 1, endIndex);
				index = endIndex;
			} else if (tag === 'Notes') {
				obj['Notes'] = contents.slice(index, contents.length).join('\n');
				index = contents.length;
			} else {
				const text = line.substring(colonIndex + ': '.length).trim();
				obj[tag] = text;
			}
		}

		console.log(obj);

		const outputPath = path.join(outputDir, changeExtensionToJson(path.basename(recipePath)));

		fs.writeJsonSync(outputPath, obj, {spaces: '\t'});

		recipePaths.push(outputPath.match(/\/recipes\/.*\.json/)[0]);
	});

	fs.writeJsonSync(path.join(outputDir, 'manifest.json'), recipePaths, {spaces: '\t'});
};

main();
