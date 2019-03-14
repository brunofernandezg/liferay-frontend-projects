/**
 * © 2017 Liferay, Inc. <https://liferay.com>
 *
 * SPDX-License-Identifier: MIT
 */

'use strict';

const _ = require('lodash');
const chalk = require('chalk');
const Insight = require('insight');
const minimist = require('minimist');
const path = require('path');
const Generator = require('yeoman-generator');
const yosay = require('yosay');

const lookup = require('liferay-theme-tasks/lib/lookup');

const {getVersionSupportMessage} = require('../common/messages');

module.exports = class extends Generator {
	initializing() {
		const pkg = require('../../package.json');

		this.pkg = pkg;

		this._insight = new Insight({
			trackingCode: 'UA-69122110-1',
			pkg,
		});
	}

	prompting() {
		const instance = this;

		instance.done = instance.async();

		this._setArgv();

		// Have Yeoman greet the user.
		instance.log(
			yosay(
				'Welcome to the splendid ' +
					chalk.red(this.options.namespace) +
					' generator!'
			)
		);

		instance.log(getVersionSupportMessage(this.options.namespace));

		const insight = this._insight;

		if (_.isUndefined(insight.optOut)) {
			insight.askPermission(null, _.bind(this._prompt, this));
		} else {
			this._prompt();
		}
	}

	_setThemeDirName() {
		let themeDirName = this.appname;

		if (!/-theme$/.test(themeDirName)) {
			themeDirName += '-theme';
		}

		this.themeDirName = themeDirName;
	}

	_enforceFolderName() {
		if (
			this.themeDirName !== _.last(this.destinationRoot().split(path.sep))
		) {
			this.destinationRoot(this.themeDirName);
		}

		this.config.save();
	}

	configuring() {
		this._setThemeDirName();
		this._enforceFolderName();
	}

	_writeApp() {
		this.fs.copyTpl(
			this.templatePath('_package.json'),
			this.destinationPath('package.json'),
			this
		);

		this.fs.copy(
			this.templatePath('gitignore'),
			this.destinationPath('.gitignore')
		);

		this.fs.copyTpl(
			this.templatePath('gulpfile.js'),
			this.destinationPath('gulpfile.js'),
			this
		);
	}

	_writeProjectFiles() {
		this.fs.copy(this.templatePath('src/**'), this.destinationPath('src'), {
			globOptions: {
				ignore: [this.templatePath('src/css/custom.css')],
			},
		});

		const customCssName = '_custom.scss';

		this.fs.copy(
			this.templatePath('src/css/custom.css'),
			this.destinationPath('src/css/' + customCssName)
		);

		this.fs.copyTpl(
			this.templatePath('src/WEB-INF/liferay-plugin-package.properties'),
			this.destinationPath(
				'src/WEB-INF/liferay-plugin-package.properties'
			),
			{
				liferayVersion: this.liferayVersion,
				liferayVersions: this.liferayVersion + '.0+',
				themeDisplayName: this.themeName,
			}
		);

		this.fs.copyTpl(
			this.templatePath('src/WEB-INF/liferay-look-and-feel.xml'),
			this.destinationPath('src/WEB-INF/liferay-look-and-feel.xml'),
			this
		);
	}

	writing() {
		this._writeApp();
		this._writeProjectFiles();
	}

	install() {
		const skipInstall = this.options['skip-install'];

		if (!skipInstall) {
			this.on('npmInstall:end', () => {
				const gulp = require('gulp');
				require('liferay-theme-tasks').registerTasks({gulp});
				gulp.start('init');
			});

			this.installDependencies({bower: false});
		}
	}

	_getArgs() {
		let args = this.args;

		if (!args) {
			args = {};

			this.args = args;
		}

		return args;
	}

	_getPrompts() {
		const instance = this;

		const prompts = [
			{
				default: 'My Liferay Theme',
				message: 'What would you like to call your theme?',
				name: 'themeName',
				type: 'input',
				when: instance._getWhenFn('themeName', 'name', _.isString),
			},
			{
				default(answers) {
					return _.kebabCase(_.deburr(answers.themeName || ''));
				},
				message: 'Would you like to use this as the themeId?',
				name: 'themeId',
				type: 'input',
				when: instance._getWhenFn('themeId', 'id', _.isString),
			},
			{
				message: 'Which version of Liferay is this theme for?',
				name: 'liferayVersion',
				choices: ['7.2'],
				type: 'list',
				when: instance._getWhenFn(
					'liferayVersion',
					'liferayVersion',
					instance._isLiferayVersion
				),
			},
		];

		return prompts;
	}

	_getWhenFn(propertyName, flag, validator) {
		const instance = this;

		const args = this._getArgs();
		const argv = this.argv;

		return function(answers) {
			let propertyValue = argv[flag];

			const liferayVersion =
				answers.liferayVersion || argv.liferayVersion;

			if (
				(!answers.liferayVersion || !args.liferayVersion) &&
				argv.liferayVersion
			) {
				answers.liferayVersion = args.liferayVersion = liferayVersion;
			}

			if (
				validator &&
				instance._isDefined(propertyValue) &&
				!validator(propertyValue, answers)
			) {
				propertyValue = null;

				instance.log(
					chalk.yellow('Warning:'),
					'Invalid value set for',
					chalk.cyan('--' + flag)
				);
			}

			let ask = true;
			const propertyDefined = instance._isDefined(propertyValue);

			if (propertyDefined) {
				args[propertyName] = propertyValue;

				ask = false;
			}

			return ask;
		};
	}

	_isDefined(value) {
		return !_.isUndefined(value) && !_.isNull(value);
	}

	_isLiferayVersion(value) {
		return ['7.2'].indexOf(value) > -1;
	}

	_mixArgs(props, args) {
		return _.assign(props, args);
	}

	_prompt() {
		this.prompt(this._getPrompts()).then(props => {
			props = this._mixArgs(props, this._getArgs());

			this._promptCallback(props);

			this._track();

			this.done();
		});
	}

	_promptCallback(props) {
		const liferayVersion = props.liferayVersion;

		this.appname = props.themeId;
		if (liferayVersion !== '*') {
			this.devDependencies = JSON.stringify(
				lookup('devDependencies', liferayVersion),
				null,
				2
			)
				.split(/\n\s*/)
				.join('\n\t\t')
				.replace('\t\t}', '\t}');
		}
		this.liferayVersion = liferayVersion;
		this.themeName = props.themeName;

		this._setPackageVersion();
	}

	_setArgv() {
		this.argv = minimist(process.argv.slice(2), {
			alias: {
				id: 'i',
				liferayVersion: 'l',
				name: 'n',
				template: 't',
			},
			string: ['liferayVersion'],
		});
	}

	_setPackageVersion() {
		this.packageVersion = '1.0.0';
	}

	_track() {
		const insight = this._insight;

		const liferayVersion = this.liferayVersion;

		insight.track('theme', liferayVersion);
	}
};
