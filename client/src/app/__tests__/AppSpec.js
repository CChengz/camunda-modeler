import React from 'react';

import {
  shallow,
  mount
} from 'enzyme';

import {
  App,
  EMPTY_TAB
} from '../App';

import {
  Backend,
  Dialog,
  FileSystem,
  TabsProvider,
  Workspace
} from './mocks';

import mitt from 'mitt';


/* global sinon */
const { spy } = sinon;


describe('<App>', function() {

  describe('props', function() {

    it('tabsProvider');

    it('onReady');

    it('onContextMenu');

    describe('globals', function() {

      describe('backend', function() {

        it('should call Backend#sendUpdateMenu on tab change', function() {

          // given
          const backend = new Backend();
          const eventBus = new mitt();
          const fileSystem = new FileSystem();
          const workspace = new Workspace();

          const spy = sinon.spy(backend, 'sendUpdateMenu');

          const {
            app
          } = createApp({
            globals: {
              backend,
              eventBus,
              fileSystem,
              workspace
            }
          });

          // when
          app.handleTabChanged();

          // then
          expect(spy).to.have.been.called;
        });

      });

    });

  });


  describe('shared buttons', function() {

    it('should offer save, save-as, export, undo, redo if supported by tab');

  });


  it('should render empty tab', function() {

    // when
    const {
      app
    } = createApp();

    // then
    const {
      tabs,
      activeTab
    } = app.state;

    expect(tabs).to.be.empty;
    expect(activeTab).to.equal(-1);
  });


  it('should create diagrams', async function() {
    // given
    const {
      app
    } = createApp();

    // when
    await app.createDiagram('bpmn');
    await app.createDiagram('dmn');
    await app.createDiagram('cmmn');
    await app.createDiagram();

    // then
    const {
      tabs,
      activeTab
    } = app.state;

    expect(tabs.map(tab => tab.type)).to.eql([
      'bpmn',
      'dmn',
      'cmmn',
      'bpmn'
    ]);

    expect(activeTab).to.eql(tabs[3]);
  });


  describe('open files', function() {

    it('should create tabs', async function() {

      // given
      const {
        app
      } = createApp();

      const file1 = createFile('1.bpmn');
      const file2 = createFile('2.bpmn');

      // when
      const openedTabs = await app.openFiles([ file1, file2 ]);

      // then
      const {
        tabs,
        activeTab
      } = app.state;

      expect(openedTabs).to.eql(tabs);
      expect(activeTab).to.eql(app.findOpenTab(file2));
    });


    it('should keep existing tabs (by path)', async function() {

      // given
      const {
        app
      } = createApp();

      const file1 = createFile('1.bpmn');
      const file2 = createFile('2.bpmn');

      await app.openFiles([ file1, file2 ]);

      const lastOpenTabs = app.state.tabs;

      // when
      await app.openFiles([ file1 ]);

      // then
      const {
        tabs,
        activeTab
      } = app.state;

      expect(tabs).to.equal(lastOpenTabs);
      expect(tabs.map(tab => tab.file)).to.eql([ file1, file2 ]);

      // existing tab is focussed
      expect(activeTab).to.eql(app.findOpenTab(file1));
    });

  });


  describe('tabs', function() {

    describe('closing', function() {

      it('should close active', async function() {

        // given
        const {
          app
        } = createApp();

        const file1 = createFile('1.bpmn');
        const file2 = createFile('2.bpmn');

        await app.openFiles([ file1, file2 ]);

        const tab = app.state.activeTab;

        // when
        await app.closeTab(tab);

        // then
        const {
          tabs,
          activeTab
        } = app.state;

        expect(tabs).not.to.contain(tab);

        // existing tab is focussed
        expect(activeTab).to.eql(app.findOpenTab(file1));
      });


      it('should close all', async function() {

        // given
        const {
          app
        } = createApp();

        const file1 = createFile('1.bpmn');
        const file2 = createFile('2.bpmn');

        await app.openFiles([ file1, file2 ]);

        // when
        await app.closeTabs(t => true);

        // then
        const {
          tabs,
          activeTab
        } = app.state;

        expect(tabs).to.be.empty;

        // existing tab is focussed
        expect(activeTab).to.equal(EMPTY_TAB);
      });

    });


    describe('saving', function() {

      let askSaveSpy;
      let writeFileSpy;

      let app;

      beforeEach(function() {

        // given
        const dialog = new Dialog();
        const eventBus = new mitt();
        const fileSystem = new FileSystem();
        const workspace = new Workspace();

        dialog.setAskSaveResponse(Promise.resolve('save'));

        askSaveSpy = spy(dialog, 'askSave');
        writeFileSpy = spy(fileSystem, 'writeFile');

        const rendered = createApp({
          globals: {
            dialog,
            eventBus,
            fileSystem,
            workspace
          }
        }, mount);

        app = rendered.app;
      });


      it('should save new file', async function() {

        // given
        const tab = await app.createDiagram();

        const fileName = tab.file.name;

        // when
        await app.triggerAction('save');

        // then
        expect(askSaveSpy).not.to.have.been.called;

        expect(writeFileSpy).to.have.been.calledWith(
          { name: fileName, contents: 'CONTENTS', path: null },
          { saveAs: true }
        );
      });


      it('should save existing tab', async function() {

        // given
        const file = createFile('1.bpmn');

        await app.openFiles([ file ]);

        // when
        await app.triggerAction('save');

        // then
        expect(askSaveSpy).not.to.have.been.called;

        expect(writeFileSpy).to.have.been.calledWith(
          { ...file, contents: 'CONTENTS' },
          { saveAs: false }
        );
      });


      it('should save as existing tab', async function() {

        // given
        const file = createFile('1.bpmn');

        await app.openFiles([ file ]);

        // when
        await app.triggerAction('save-as');

        // then
        expect(askSaveSpy).not.to.have.been.called;

        expect(writeFileSpy).to.have.been.calledWith(
          { ...file, contents: 'CONTENTS' },
          { saveAs: true }
        );
      });


      it('should ask to save on close', async function() {

        // given
        const tab = await app.createDiagram();

        // when
        await app.triggerAction('close-tab', { tabId: tab.id });

        // then
        expect(askSaveSpy).to.have.been.calledOnce;

        expect(writeFileSpy).to.have.been.calledWith(
          { name: 'diagram_1.bpmn', path: null, contents: 'CONTENTS' },
          { saveAs: true }
        );
      });


      it('should save all tabs');

    });


    describe('exporting', function() {

      let askExportAsSpy;
      let writeFileSpy;

      let app;

      beforeEach(function() {

        // given
        const dialog = new Dialog();
        const eventBus = mitt();
        const fileSystem = new FileSystem();
        const workspace = new Workspace();

        dialog.setAskExportAsResponse(Promise.resolve({
          fileType: 'svg',
          name: 'foo.svg',
          path: 'foo'
        }));

        askExportAsSpy = spy(dialog, 'askExportAs');
        writeFileSpy = spy(fileSystem, 'writeFile');

        const rendered = createApp({
          globals: {
            dialog,
            eventBus,
            fileSystem,
            workspace
          }
        }, mount);

        app = rendered.app;
      });


      it('should export SVG', async function() {

        // given
        await app.createDiagram();

        // when
        await app.triggerAction('export-as');

        // then
        expect(askExportAsSpy).to.have.been.called;

        expect(writeFileSpy).to.have.been.calledWith({
          contents: 'CONTENTS',
          fileType: 'svg',
          name: 'foo.svg',
          path: 'foo'
        });
      });

    });


    describe('loading', function() {

      it('should support life-cycle', async function() {

        // given
        const events = [];

        const onTabChanged = spy(function(tab, oldTab) {
          events.push([ 'tab-changed', tab ]);

          app.handleTabShown(tab);
        });

        const onTabShown = spy(function(tab) {
          events.push([ 'tab-shown', tab ]);
        });

        const {
          app
        } = createApp({
          onTabChanged,
          onTabShown
        });

        // when
        const tab = await app.createDiagram('bpmn');

        // then
        expect(events).to.eql([
          [ 'tab-changed', tab ],
          [ 'tab-shown', tab ]
        ]);
      });


      it('should lazy load via tabsProvider', async function() {

        // given
        const events = [];

        const onTabChanged = spy(function(tab, oldTab) {
          events.push([ 'tab-changed', tab ]);
        });

        const onTabShown = spy(function(tab) {
          events.push([ 'tab-shown', tab ]);
        });

        const {
          app
        } = createApp({
          onTabChanged,
          onTabShown
        }, mount);

        // when
        const tab = await app.createDiagram('bpmn');


        // then
        expect(events).to.eql([
          [ 'tab-changed', tab ],
          [ 'tab-shown', tab ]
        ]);
      });

    });


    describe('navigation', function() {

      let app, openedTabs;

      beforeEach(async function() {
        const rendered = createApp();

        app = rendered.app;

        const file1 = createFile('1.bpmn');
        const file2 = createFile('2.bpmn');

        openedTabs = [
          await app.createDiagram(),
          ...(await app.openFiles([ file1, file2 ])),
          await app.createDiagram(),
        ];

        // assume
        const {
          tabs,
          activeTab
        } = app.state;

        expect(tabs).to.eql(openedTabs);
        expect(activeTab).to.eql(openedTabs[3]);
      });


      it('should select tab', async function() {

        // when
        await app.selectTab(openedTabs[0]);

        // then
        const {
          activeTab
        } = app.state;

        expect(activeTab).to.eql(openedTabs[0]);
      });


      describe('should navigate', function() {

        it('back', async function() {

          // when
          await app.navigate(-1);

          // then
          const {
            activeTab
          } = app.state;

          expect(activeTab).to.eql(openedTabs[2]);
        });


        it('forward', async function() {

          // when
          await app.navigate(1);

          // then
          const {
            activeTab
          } = app.state;

          expect(activeTab).to.eql(openedTabs[0]);
        });

      });


      describe('should reopen last', function() {

        it('saved', async function() {

          // given
          const savedTab = openedTabs[2];
          const file = savedTab.file;

          await app.closeTab(savedTab);

          // when
          await app.triggerAction('reopen-last-tab');

          // then
          const {
            activeTab
          } = app.state;

          expect(activeTab.file).to.eql(file);
        });


        it('reject unsaved', async function() {

          // given
          const newTab = openedTabs[3];

          await app.closeTab(newTab);

          // when
          try {
            await app.triggerAction('reopen-last-tab');

            expect.fail('expected exception');
          } catch (e) {
            expect(e.message).to.eql('no last tab');
          }
        });


        it('after all closed', async function() {

          // given
          await app.closeTabs((t) => true);

          // when
          await app.triggerAction('reopen-last-tab');
          await app.triggerAction('reopen-last-tab');

          // then
          const {
            activeTab,
            tabs
          } = app.state;

          const expectedOpen = [
            app.findOpenTab(openedTabs[2].file),
            app.findOpenTab(openedTabs[1].file)
          ];

          expect(tabs).to.eql(expectedOpen);
          expect(activeTab).to.eql(expectedOpen[1]);
        });

      });


      describe('__internal__', function() {

        it('should reset state on all closed', async function() {

          // when
          await app.triggerAction('close-all-tabs');

          // then
          const tabHistory = app.tabHistory;

          expect(tabHistory.elements).to.be.empty;
          expect(tabHistory.idx).to.eql(-1);
          expect(tabHistory.get()).not.to.exist;
        });

      });

    });


    describe('errors', function() {

      let app, openedTabs;

      beforeEach(async function() {
        const rendered = createApp(mount);

        app = rendered.app;

        const file1 = createFile('1.bpmn');

        openedTabs = await app.openFiles([ file1 ]);

        // assume
        const {
          tabs,
          activeTab
        } = app.state;

        expect(tabs).to.eql(openedTabs);
        expect(activeTab).to.eql(openedTabs[0]);
      });


      // TODO(philippfromme): spy is not called, why?
      it.skip('should error', function() {

        // given
        const handleTabErrorSpy = sinon.spy(app, 'handleTabError');

        const tab = app.tabRef.current;

        // when
        tab.triggerAction('error', 'foo');

        // then
        expect(handleTabErrorSpy).to.have.been.called;
        // expect(handleTabErrorSpy).to.have.been.calledWith(openedTabs[0], 'foo');
      });

    });


    describe('workspace', function() {

      describe('restore workspace', function() {

        let app,
            eventBus,
            restoreSpy,
            tab,
            workspace;

        beforeEach(async function() {
          tab = new TabsProvider().createTabForFile(createFile('1.bpmn'));

          eventBus = mitt();

          workspace = new Workspace({
            activeTab: 0,
            files: [ tab.file ],
            layout: {
              minimap: {
                open: true
              },
              propertiesPanel: {
                open: false
              }
            }
          });

          restoreSpy = spy(workspace, 'restore');

          const rendered = createApp({
            globals: {
              dialog: new Dialog(),
              eventBus,
              fileSystem: new FileSystem(),
              workspace
            }
          }, mount);

          app = rendered.app;
        });


        it.skip('should retrieve workspace on mount', function() {

          // then
          expect(restoreSpy).to.have.been.called;

          expect(app.state.tabs).to.eql([ tab ]);

          // TODO(fix): layout will be requested in componentDidMount
          expect(app.state.layout).to.eql({
            minimap: {
              open: true
            },
            propertiesPanel: {
              open: false
            }
          });
        });

      });


      describe('save workspace', function() {

        let app, openedTabs, workspace;

        beforeEach(async function() {
          workspace = new Workspace();

          const rendered = createApp({
            globals: {
              dialog: new Dialog(),
              eventBus: mitt(),
              fileSystem: new FileSystem(),
              workspace
            }
          }, mount);

          app = rendered.app;

          const file1 = createFile('1.bpmn');
          const file2 = createFile('2.bpmn');

          openedTabs = await app.openFiles([ file1, file2 ]);

          // assume
          const {
            tabs,
            activeTab
          } = app.state;

          expect(tabs).to.eql(openedTabs);
          expect(activeTab).to.eql(openedTabs[1]);
        });


        it('should save workspace on tab save', async function() {

          // given
          const saveSpy = spy(workspace, 'save');

          // when
          await app.saveTab(openedTabs[0]);

          // then
          expect(saveSpy).to.have.been.calledWith({
            activeTab: 0,
            layout: {},
            files: [{
              name: '1.bpmn',
              path: '1.bpmn'
            }, {
              name: '2.bpmn',
              path: '2.bpmn'
            }]
          });
        });


        it('should save workspace on tab select', async function() {

          // given
          const saveSpy = spy(workspace, 'save');

          // when
          await app.selectTab(openedTabs[0]);

          // then
          expect(saveSpy).to.have.been.calledWith({
            activeTab: 0,
            layout: {},
            files: [{
              name: '1.bpmn',
              path: '1.bpmn'
            }, {
              name: '2.bpmn',
              path: '2.bpmn'
            }]
          });
        });


        it('should save workspace on tab close', async function() {

          // given
          const saveSpy = spy(workspace, 'save');

          // when
          await app.closeTab(openedTabs[1]);

          // then
          expect(saveSpy).to.have.been.calledWith({
            activeTab: 0,
            layout: {},
            files: [{
              name: '1.bpmn',
              path: '1.bpmn'
            }]
          });
        });

      });

    });

  });

});


class Cache {
  destroy() { }
}


function createApp(options = {}, mountFn=shallow) {

  if (typeof options === 'function') {
    mountFn = options;
    options = {};
  }

  let app;

  const cache = options.cache || new Cache();

  const globals = options.globals || {
    dialog: new Dialog(),
    eventBus: mitt(),
    fileSystem: new FileSystem(),
    workspace: new Workspace()
  };

  const tabsProvider = options.tabsProvider || new TabsProvider();

  const onTabChanged = options.onTabChanged || function(newTab) {
    app.handleTabShown(newTab);
  };

  const onTabShown = options.onTabShown;
  const onReady = options.onReady;

  const tree = mountFn(
    <App
      cache={ cache }
      globals={ globals }
      tabsProvider={ tabsProvider }
      onReady={ onReady }
      onTabChanged={ onTabChanged }
      onTabShown={ onTabShown }
    />
  );

  app = tree.instance();

  return {
    tree,
    app
  };

}


function createFile(name, path) {

  path = typeof path === 'undefined' ? name : path;

  return {
    name,
    path
  };
}