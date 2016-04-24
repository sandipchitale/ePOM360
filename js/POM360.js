(function() {
    var process = require('process');
    var path = require('path');
    var fileSystem = require('fs');
    var childProcess = require('child_process');
    var pathExtra = require('path-extra');
    var openThis = require('open');
    var remote = require('remote');

    var mvnContent;
    var mvnFooter;

    var initialHeight;
    var dynamicHeight;

    function contentHeight() {
        var nowHeight = mvnFooter.offset().top - mvnContent.offset().top;
        var textAreas = $('textarea');
        if (textAreas) {
            for (var i = 0; i < textAreas.length; i++) {
                var textArea = $(textAreas[i]);
                if (textArea.hasClass('dynamic-height')) {
                    textArea.height(textArea.height() + nowHeight - dynamicHeight);
                } else {
                    textArea.height(textArea.height() + nowHeight - initialHeight);
                }
                textArea.addClass('dynamic-height');
            }
        }
        dynamicHeight = nowHeight;
    }

    angular.module("POM360App", ['ui.router']).config(function($stateProvider, $urlRouterProvider) {
        $stateProvider.state('POM360', {
            url : '/',
            templateUrl : 'templates/effective-pom.html'
        }).state('effective-pom', {
            url : '/effective-pom',
            templateUrl : 'templates/effective-pom.html'
        }).state('dependencies', {
            url : '/dependencies',
            templateUrl : 'templates/dependencies.html'
        }).state('agenda', {
            url : '/agenda',
            templateUrl : 'templates/agenda.html'
        }).state('profiles', {
            url : '/profiles',
            templateUrl : 'templates/profiles.html'
        }).state('effective-settings', {
            url : '/effective-settings',
            templateUrl : 'templates/effective-settings.html'
        }).state('system', {
            url : '/system',
            templateUrl : 'templates/system.html'
        }).state('cliargs', {
            url : '/cliargs',
            templateUrl : 'templates/cliargs.html'
        }).state('describe-plugin', {
            url : '/describe-plugin',
            templateUrl : 'templates/describe-plugin.html'
        });
    })
    .run(function($rootScope, $window, $location) {
        // listen change start events
        $rootScope.$on('$stateChangeSuccess', function() {
                setTimeout(contentHeight, 1);
            });

        $rootScope.openThis = function(fileOrUrl) {
            openThis(fileOrUrl);
            return false;
        }
        $rootScope.openThisRelativeToHomeDir = function(relativePathToFile) {
            return $rootScope.openThis(pathExtra.homedir() + '/' + relativePathToFile);
        }
    }).controller('POM360Controller', function($scope, $location) {
        $scope.debug = function() {
            remote.getCurrentWindow().webContents.openDevTools();
        }

        $scope.atEffectivePomTab = function() {
            return ($location.path() === '/' || $location.path() === '/effective-pom');
        }

        $scope.atDependenciesTab = function() {
            return ($location.path() === '/dependencies');
        }

        $scope.atAgendaTab = function() {
            return ($location.path() === '/agenda');
        }

        $scope.atProfilesTab = function() {
            return ($location.path() === '/profiles');
        }

        $scope.atEffectiveSettingsTab = function() {
            return ($location.path() === '/effective-settings');
        }

        $scope.atSystemTab = function() {
            return ($location.path() === '/system');
        }

        $scope.atRunTab = function() {
            return ($location.path() === '/cliargs');
        }

        $scope.atDescribePluginTab = function() {
            return ($location.path() === '/describe-plugin');
        }

        var pom360SettingsFilePath =  path.join(pathExtra.homedir(), '.pom360.json');
        var pom360Settings = {

        }

        function loadSettings() {
            if (fileSystem.existsSync(pom360SettingsFilePath)) {
                try {
                    pom360Settings = JSON.parse(fileSystem.readFileSync(pom360SettingsFilePath));
                } catch (e) {
                }
            } else {
                saveSettings();
            }
        };

        function saveSettings() {
            fileSystem.writeFileSync(pom360SettingsFilePath, JSON.stringify(pom360Settings));
        }

        loadSettings();

        $scope.config = {
            mvnCommand: pom360Settings.mvnCommand || 'mvn',
            mvnCommandDir: '.',
            mvnOptions: '',
            pomFile: pom360Settings.pomFile || '',
            pomDir: '.',
            defaultPomFile: path.join(process.cwd(), 'pom.xml'),
            settingsFile: '',
            defaultSettingsFile: path.join(pathExtra.homedir(), '.m2', 'settings.xml')
        }

        $scope.cli = {
            args: '-h',
            argsCommon: [
                '-h',
                'install',
                'clean install',
                '-DskipText=true package',
                'clean package',
                '-DskipText=true clean package',
                'clean'
            ]
        }

        $scope.setCliArgs = function(cliArgs) {
            $scope.cli.args = cliArgs;
        }

        $scope.plugin = {
            gid: 'org.apache.maven.plugins',
            gids: ['org.apache.maven.plugins'],
            aid: 'maven-help-plugin',
            aids: ['maven-help-plugin',
                'maven-dependency-plugin',
                'maven-compiler-plugin',
                'maven-resources-plugin',
                'maven-install-plugin',
                'maven-assembly-plugin',
                'maven-archiver-plugin']
        }

        $scope.setGid = function(gid) {
            $scope.plugin.gid = gid;
        }

        $scope.setAid = function(aid) {
            $scope.plugin.aid = aid;
        }

        var mvn = $('#mvn');
        var pom = $('#pom');
        var settings = $('#settings');
        var editorDialog = $('#editor-dialog');

        $scope.editor = {
            title: '',
            content: ''
        };

        $scope.save = function() {
            try {
                if ('POM' === $scope.editor.title) {
                    var pomFile = pom.val().trim();
                    fileSystem.writeFileSync(pomFile, $scope.editor.content);
                } else  if ('Settings' === $scope.editor.title) {
                    var settingsFile = settings.val().trim();
                    fileSystem.writeFileSync(settingsFile, $scope.editor.content);
                }
            } finally {
            }
            editorDialog.modal('hide');
            $scope.editor.title = '';
            $scope.editor.content = '';
        };

        var findTextInput = $('#find-text');

        $scope.findSpecs = {
            text: '',
            caseSensitive: false
        };

        var lastFocusedTextArea;
        $(document.body).focusin(function(e) {
            if ($(e.target).is('textarea')) {
                lastFocusedTextArea = e.target;
            }
        });

        $scope.findText = function() {
            if ('' === $scope.findSpecs.text) {
                return;
            }
            var textAreas = $('textarea');
            if (textAreas) {
                var textToFind;
                if ($scope.findSpecs.caseSensitive) {
                    textToFind = $scope.findSpecs.text;
                } else {
                    textToFind = $scope.findSpecs.text.toLowerCase();
                }
                var textArea;
                for (var i = 0; i < textAreas.length; i++) {
                    if ($(textAreas[i]).get()[0] === lastFocusedTextArea) {
                        textArea = $(textAreas[i]);
                        break;
                    };
                }
                if (!textArea && textAreas.length > 0) {
                    textArea = $(textAreas[0]);
                }

                if (!textArea) {
                    return;
                }

                var text;
                if ($scope.findSpecs.caseSensitive) {
                    text = textArea.val();
                } else {
                    text = textArea.val().toLowerCase();
                }
                if (text.length === 0) {
                    return;
                }
                var selectionStart = textArea.prop('selectionStart');
                var selectionEnd = textArea.prop('selectionEnd');
                var foundAt = text.indexOf($scope.findSpecs.text, selectionEnd);
                if (foundAt != -1) {
                    textArea.prop('selectionStart', foundAt);
                    textArea.prop('selectionEnd', foundAt + $scope.findSpecs.text.length);
                } else if (selectionEnd != 0) {
                    text = text.substring(0, selectionEnd);
                    var foundAt = text.indexOf($scope.findSpecs.text, 0);
                    if (foundAt != -1) {
                        textArea.prop('selectionStart', foundAt);
                        textArea.prop('selectionEnd', foundAt + $scope.findSpecs.text.length);
                    }
                }
                if (foundAt != -1) {
                    // scroll
                    textArea.focus();
                    setTimeout(function() { findTextInput.focus(); textArea.focus(); }, 0);
                }
            }
        };

        function cantRun() {
            return mvn.parent().hasClass('has-error') || pom.parent().hasClass('has-error') || settings.parent().hasClass('has-error');
        };

        $scope.mvnHasError =  function() {
            return mvn.parent().hasClass('has-error');
        }

        $scope.pomHasError =  function() {
            return pom.parent().hasClass('has-error');
        }

        $scope.settingsHasError =  function() {
            return settings.parent().hasClass('has-error');
        }

        function validateMvnCommand() {
            var mvnCommand = mvn.val().trim();
            if (fileSystem.existsSync(mvnCommand)) {
                mvn.parent().removeClass('has-error');
            } else {
                mvn.parent().addClass('has-error');
            }
        };
        mvn.on('input', validateMvnCommand);
        setTimeout(0, validateMvnCommand);

        function validatePomFile() {
            var pomFile = pom.val().trim();

            if (fileSystem.existsSync(pomFile)) {
                pom.parent().removeClass('has-error');
            } else {
                pom.parent().addClass('has-error');
            }
        };
        pom.on('input', validatePomFile);
        setTimeout(0, validatePomFile);

        $scope.editPomFile = function() {
            if (pom.parent().hasClass('has-error')) {
                return;
            }

            fileSystem.readFile(pom.val().trim(), 'utf8', function(err, data) {
                if (err) {
                    return console.log(err);
                }
                $scope.editor.title = 'POM';
                $scope.editor.content = data;
                $scope.$apply();
                editorDialog.modal();
            });
        };

        function validateSettingsFile() {
            var settingsFile = settings.val().trim();

            if (settingsFile === '') {
                settings.parent().removeClass('has-error');
                return;
            }
            if (fileSystem.existsSync(settingsFile)) {
                settings.parent().removeClass('has-error');
            } else {
                settings.parent().addClass('has-error');
            }
        }
        settings.on('input', validateSettingsFile);
        setTimeout(0, validateSettingsFile);

        $scope.editSettingsFile = function() {
            if (settings.parent().hasClass('has-error')) {
                return;
            }
            fileSystem.readFile(settings.val().trim(), 'utf8', function(err, data) {
                if (err) {
                    return console.log(err);
                }
                $scope.editor.title = 'Settings';
                $scope.editor.content = data;
                $scope.$apply();
                editorDialog.modal();
            });
        }

        $scope.exit = function() {
            remote.getCurrentWindow().close();
        }

        // Select mvn command
        var mvnCommandSelector = $('#mvnCommandSelector');
        mvnCommandSelector.change(function(evt) {
            if ('' !== mvnCommandSelector.val().trim()) {
                $scope.config.mvnCommand = mvnCommandSelector.val().trim();
                $scope.config.mvnCommandDir = path.dirname($scope.config.mvnCommand);

                $scope.$apply();
                setTimeout(validateMvnCommand, 0);
            }
        });
        $scope.selectMvnCommand = function() {
            mvnCommandSelector.trigger('click');
        }

        // Select POM file
        var pomFileSelector = $('#pomFileSelector');
        pomFileSelector.change(function(evt) {
            if ('' !== pomFileSelector.val().trim()) {
                $scope.config.pomFile = pomFileSelector.val().trim();
                $scope.config.pomDir = path.dirname($scope.config.pomFile);

                $scope.$apply();
                setTimeout(validatePomFile, 0);
            }
        });
        $scope.selectPomFile = function() {
            pomFileSelector.trigger('click');
        }

        var settingsFileSelector = $('#settingsFileSelector');
        settingsFileSelector.change(function(evt) {
            if ('' !== settingsFileSelector.val().trim()) {
                $scope.config.settingsFile = settingsFileSelector.val().trim();
                $scope.$apply();
                setTimeout(validateSettingsFile, 0);
            }
        });

        $scope.selectSettingsFile = function() {
            settingsFileSelector.trigger('click');
        }

        function runMvnCommand(mvnCommand, pomFile, commands, textArea, filters) {
            textArea.val('');
            $(textArea).addClass('busy');
            var pomDir = path.dirname(pomFile);
            var args = ['-B'];
            if (pomFile) {
                args.push('-f');
                args.push(pomFile);
            }
            if ($.isArray(commands)) {
                args = args.concat(commands);
            } else if ((typeof commands) === 'string') {
                args = args.concat(commands.split('\\s+'));
            }

            pom360Settings.mvnCommand = mvnCommand;
            if (pomFile) {
                pom360Settings.pomFile = pomFile;
            }
            saveSettings();

            var mvnProcess = childProcess.spawn(mvnCommand,
                args,
                {
                    cwd: pomDir,
                    env: process.env
                });

            if ($scope.mvnDetailsShowing) {
                $scope.toggleMvnDetails();
            }

            mvnProcess.stdout.on('data', function (data) {
                textArea.val(textArea.val() + data);
            });

            mvnProcess.stderr.on('data', function (data) {
                textArea.val(textArea.val() + data);
            });

            mvnProcess.on('close', function (code) {
                if (code === 0) {
                    if (filters) {
                        var val = $(textArea).val();
                        for (var i = 0; i < filters.length; i++) {
                            val = val.replace(filters[i].searchValue, filters[i].replaceValue);
                        }
                        $(textArea).val(val);
                    }
                }
                $(textArea).removeClass('busy');
            });
        }

        $scope.runEffectivePom = function() {
            if (cantRun()) {
                return;
            }
            var mvnCommand = mvn.val();
            fileSystem.stat(mvnCommand, function(err, stat) {
                if (err) {
                    return;
                }
                if (stat.isFile()) {
                    var pomFile = pom.val();
                    fileSystem.stat(pomFile, function(err, stat) {
                        if (err) {
                            return;
                        }
                        if (stat.isFile()) {
                            var effectivePomCommand = $('#effective-pom-command');
                            if (effectivePomCommand) {
                                effectivePomCommand.val(mvn.val() + (pomFile ? ' -f ' + pomFile : '') + ' help:effective-pom')
                            }
                            var effectivePom = $('#effective-pom');
                            if (effectivePom) {
                                runMvnCommand(mvnCommand, pomFile, 'help:effective-pom', effectivePom, [{searchValue: /\[INFO\].+\n/g, replaceValue: ''}]);
                            }
                        }
                    });
                }
            });
        }

        $scope.runDependencies = function() {
            if (cantRun()) {
                return;
            }
            var mvnCommand = mvn.val();
            fileSystem.stat(mvnCommand, function(err, stat) {
                if (err) {
                    return;
                }
                if (stat.isFile()) {
                    var pomFile = pom.val();
                    fileSystem.stat(pomFile, function(err, stat) {
                        if (err) {
                            return;
                        }
                        if (stat.isFile()) {
                            var dependenciesCommand = $('#dependencies-command');
                            if (dependenciesCommand) {
                                dependenciesCommand.val(mvn.val() + (pomFile ? ' -f ' + pomFile : '') + ' dependency:tree')
                            }
                            var dependencies = $('#dependencies');
                            if (dependencies) {
                                runMvnCommand(mvnCommand, pomFile, 'dependency:tree', dependencies
                                ,[
                                {searchValue: /(\n|\r|.)*\[INFO\] --- maven-dependency-plugin.+\n/gm, replaceValue: ''}
                                ,{searchValue: /^\[INFO\] BUILD SUCCESS(\n|\r|.)*/gm, replaceValue: ''}
                                ,{searchValue: /^\[INFO\] -------------------------(\n|\r|.)*/gm, replaceValue: ''}
                                ,{searchValue: /^\[INFO\]\s+/gm, replaceValue: ''}
                                ]
                               );
                            }
                        }
                    });
                }
            });
        }

        $scope.runAgenda = function() {
            if (cantRun()) {
                return;
            }
            var mvnCommand = mvn.val();
            fileSystem.stat(mvnCommand, function(err, stat) {
                if (err) {
                    return;
                }
                if (stat.isFile()) {
                    var pomFile = pom.val();
                    fileSystem.stat(pomFile, function(err, stat) {
                        if (err) {
                            return;
                        }
                        if (stat.isFile()) {
                            var agendaCommand = $('#agenda-command');
                            if (agendaCommand) {
                                agendaCommand.val(mvn.val() + (pomFile ? ' -f ' + pomFile : '') + ' help:describe -Dcmd=clean -Dcmd=deploy -Dcmd=site')
                            }
                            var cleanAgenda = $('#clean-agenda');
                            if (cleanAgenda) {
                                runMvnCommand(mvnCommand, pomFile, ['help:describe', '-Dcmd=clean'], cleanAgenda,
                                [{searchValue: /\[INFO\].+\n/g, replaceValue: ''}]);
                            }
                            var deployAgenda = $('#deploy-agenda');
                            if (deployAgenda) {
                                runMvnCommand(mvnCommand, pomFile, ['help:describe', '-Dcmd=deploy'], deployAgenda,
                                [{searchValue: /\[INFO\].+\n/g, replaceValue: ''}]);
                            }
                            var siteAgenda = $('#site-agenda');
                            if (siteAgenda) {
                                runMvnCommand(mvnCommand, pomFile, ['help:describe', '-Dcmd=site'], siteAgenda,
                                [{searchValue: /\[INFO\].+\n/g, replaceValue: ''}]);
                            }
                        }
                    });
                }
            });
        }

        $scope.runProfiles = function() {
            if (cantRun()) {
                return;
            }
            var mvnCommand = mvn.val();
            fileSystem.stat(mvnCommand, function(err, stat) {
                if (err) {
                    return;
                }
                if (stat.isFile()) {
                    var pomFile = pom.val();
                    fileSystem.stat(pomFile, function(err, stat) {
                        if (err) {
                            return;
                        }
                        if (stat.isFile()) {
                            var profilesCommand = $('#profiles-command');
                            if (profilesCommand) {
                                profilesCommand.val(mvn.val() + (pomFile ? ' -f ' + pomFile : '') + ' help:describe -Dcmd=clean -Dcmd=deploy -Dcmd=site')
                            }
                            var activeProfiles = $('#active-profiles');
                            if (activeProfiles) {
                                runMvnCommand(mvnCommand, pomFile, ['help:active-profiles'], activeProfiles,
                                [{searchValue: /\[INFO\].+\n/g, replaceValue: ''}]);
                            }
                            var allProfiles = $('#all-profiles');
                            if (allProfiles) {
                                runMvnCommand(mvnCommand, pomFile, ['help:all-profiles'], allProfiles,
                                [{searchValue: /\[INFO\].+\n/g, replaceValue: ''}]);
                            }
                        }
                    });
                }
            });
        }

        $scope.runEffectiveSettings = function() {
            if (cantRun()) {
                return;
            }
            var mvnCommand = mvn.val();
            fileSystem.stat(mvnCommand, function(err, stat) {
                if (err) {
                    return;
                }
                if (stat.isFile()) {
                    var pomFile = pom.val();
                    fileSystem.stat(pomFile, function(err, stat) {
                        if (err) {
                            return;
                        }
                        if (stat.isFile()) {
                            var effectiveSettingsCommand = $('#effective-settings-command');
                            if (effectiveSettingsCommand) {
                                effectiveSettingsCommand.val(mvn.val() + (pomFile ? ' -f ' + pomFile : '') + ' help:effective-settings')
                            }
                            var effectiveSettings = $('#effective-settings');
                            if (effectiveSettings) {
                                runMvnCommand(mvnCommand, pomFile, 'help:effective-settings', effectiveSettings, [{searchValue: /\[INFO\].+\n/g, replaceValue: ''}]);
                            }
                        }
                    });
                }
            });
        }

        $scope.runSystem = function() {
            if (cantRun()) {
                return;
            }
            var mvnCommand = mvn.val();
            fileSystem.stat(mvnCommand, function(err, stat) {
                if (err) {
                    return;
                }
                if (stat.isFile()) {
                    var pomFile = pom.val();
                    fileSystem.stat(pomFile, function(err, stat) {
                        if (err) {
                            return;
                        }
                        if (stat.isFile()) {
                            var systemCommand = $('#system-command');
                            if (systemCommand) {
                                systemCommand.val(mvn.val() + (pomFile ? ' -f ' + pomFile : '') + ' help:system')
                            }
                            var system = $('#system');
                            if (system) {
                                runMvnCommand(mvnCommand, pomFile, 'help:system', system, [{searchValue: /\[INFO\].+\n/g, replaceValue: ''}]);
                            }
                        }
                    });
                }
            });
        }

        $scope.runCliArgs = function() {
            if (mvn.parent().hasClass('has-error')) {
                return;
            }
            var mvnCommand = mvn.val();
            fileSystem.stat(mvnCommand, function(err, stat) {
                if (err) {
                    return;
                }
                if (stat.isFile()) {
                    var mvnCommandInput = $('#mvnCommand');
                    if (mvnCommandInput) {
                        mvnCommandInput.val(mvn.val())
                    }

                    var pomFile;
                    if (!pom.parent().hasClass('has-error')) {
                            pomFile = pom.val().trim();
                    }

                    var cliArgsOutput = $('#cli-args-output');

                    runMvnCommand(mvnCommand, ('' === pomFile ? null : pomFile), $scope.cli.args.split(" "), cliArgsOutput);
                }
            });
        }

        $scope.runDescribePlugin = function() {
            if (cantRun()) {
                return;
            }
            var mvnCommand = mvn.val();
            fileSystem.stat(mvnCommand, function(err, stat) {
                if (err) {
                    return;
                }
                if (stat.isFile()) {
                    var mvnCommandInput = $('#mvnCommand');
                    if (mvnCommandInput) {
                        mvnCommandInput.val(mvn.val())
                    }

                    var pomFile;
                    if (!pom.parent().hasClass('has-error')) {
                            pomFile - pom.val();
                    }

                    var describePluginCommand = $('#describe-plugin-command');
                    if (describePluginCommand) {
                        describePluginCommand.val(mvn.val() + (pomFile ? ' -f ' + pomFile : '') + ' help:describe -Ddetail -Dplugin=' + $scope.plugin.gid + ':' + $scope.plugin.aid)
                    }
                    var describePlugin = $('#describe-plugin');
                    if (describePlugin) {
                        runMvnCommand(mvnCommand, pomFile,
                            ['help:describe', '-Ddetail', '-Dplugin=' + $scope.plugin.gid + ':' + $scope.plugin.aid],
                            describePlugin, [{searchValue: /\[INFO\].+\n/g, replaceValue: ''}]);
                    }
                }
            });
        }

        mvnContent = $('#mvn-content');
        mvnFooter = $('#mvn-footer');

        initialHeight = mvnFooter.offset().top - mvnContent.offset().top;
        dynamicHeight = initialHeight;

        $(window).resize(contentHeight);

        var mvnDetailsDiv = $("#mvn-details");
        $scope.mvnDetailsShowing = true;
        $scope.toggleMvnDetails = function() {
            var beforeHeight = mvnFooter.height();
			if ($scope.mvnDetailsShowing) {
				mvnDetailsDiv.hide();
			} else {
				mvnDetailsDiv.show();
			}
			$scope.mvnDetailsShowing = !$scope.mvnDetailsShowing;
            contentHeight();
        }

    });
})();
