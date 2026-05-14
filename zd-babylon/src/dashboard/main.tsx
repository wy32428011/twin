import { Component } from "react";
import { createRoot } from "react-dom/client";
import { ipcRenderer, shell, webFrame } from "electron";
import { Fade } from "react-awesome-reveal";

import { DashboardWindowControls } from "./window-controls";
import { wait } from "../tools/tools";
import { Separator } from "../ui/shadcn/ui/separator";
import { Button } from "../ui/shadcn/ui/button";
import { tryGetCloseDashboardOnProjectOpenFromLocalStorage, tryGetProjectsFromLocalStorage } from "../tools/local-storage";
import { projectsKey, ProjectType } from "../tools/project";
import { DashboardCreateProjectDialog } from "./create";
import { DashboardProjectItem } from "./item";
import { showAlert, showConfirm } from "../ui/dialog";
import { pathExists } from "fs-extra";
import { checkNodeJSAvailable, nodeJSAvailable } from "../tools/process";

// import packageJson from "../../package.json";


export function createDashboard(): void {
  const theme = localStorage.getItem("editor-theme") ?? "dark";
  if (theme === "dark") {
    document.body.classList.add("dark");
  }

  const div = document.getElementById("editor-main-div")!;

  const root = createRoot(div);
  root.render(
    <div className="w-screen h-screen">
      <Dashboard />
    </div>
  );
}


export interface IDashboardProps {
  // ...
}

export interface IDashboardState {
  projects: ProjectType[];
  openedProjects: string[];

  createProject: boolean;
  closeDashboardOnProjectOpen: boolean;
}

export class Dashboard extends Component<IDashboardProps, IDashboardState> {
  public constructor(props: IDashboardProps) {
    super(props);

    this.state = {
      openedProjects: [],
      projects: tryGetProjectsFromLocalStorage(),

      createProject: false,
      closeDashboardOnProjectOpen: tryGetCloseDashboardOnProjectOpenFromLocalStorage(),
    };

    webFrame.setZoomFactor(0.8);
  }

  public render() {

    return (
      <>
        <div className="flex flex-col gap-4 w-screen h-screen p-5 select-none pt-10">
          <div className="flex flex-col gap-4 flex-[0_0_auto]">
            <DashboardWindowControls />
            <Fade delay={0}>
              <div className="flex justify-between items-end w-full mt-1">
                <div className="text-5xl font-semibold">中鼎集成</div>

                <div className="flex flex-col items-end gap-2">
                  {/* <img alt="" src="assets/babylonjs_icon.png" className="w-[48px] object-contain" /> */}
                  {/* <div className="text-xs">Babylon.js Editor !!v{packageJson.version}</div> */}
                </div>
              </div>
            </Fade>

            <Fade delay={250}>
              <Separator />
            </Fade>
            <Fade delay={500}>
              <div className="flex justify-between items-center">
                <div className="text-3xl font-semibold">项目列表</div>

                <div className="flex gap-2">
                  <Button variant="secondary" className="font-semibold" onClick={() => this._handleAssociateProject()}>
                    关联项目
                  </Button>
                </div>
              </div>
            </Fade>
          </div>
          <Fade delay={750} className="flex-auto overflow-y-auto p-2">
            {!this.state.projects.length && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">未找到项目。</div>}

            {this.state.projects.length && (
              <div className="grid sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4">
                {this.state.projects.map((project) => (
                  <DashboardProjectItem
                    project={project}
                    key={project.absolutePath}
                    isOpened={this.state.openedProjects.includes(project.absolutePath)}
                    closeDashboardOnProjectOpen={this.state.closeDashboardOnProjectOpen}
                    onRemove={() => this._tryRemoveProjectFromLocalStorage(project)}
                  />
                ))}
              </div>
            )}
          </Fade>
        </div>

        <DashboardCreateProjectDialog
          isOpened={this.state.createProject}
          closeDashboardOnProjectOpen={this.state.closeDashboardOnProjectOpen}
          onClose={() => {
            this.setState({
              createProject: false,
              projects: tryGetProjectsFromLocalStorage(),
            });
          }}
        />
      </>
    );
  }

  public async componentDidMount(): Promise<void> {

    // ipcRenderer.on("dashboard:import-project", () => this._handleImportProject());
    // ipcRenderer.on("dashboard:new-project", () => this.setState({ createProject: true }));

    ipcRenderer.on("dashboard:opened-projects", (_, openedProjects) => this.setState({ openedProjects }));
    ipcRenderer.on("dashboard:update-projects", () => this.setState({ projects: tryGetProjectsFromLocalStorage() }));

    try {
      this._checkSystemAvailabilities();

      // Update list of projects to remove those that were deleted from the hard drive
      const projects = this.state.projects.slice();

      projects.forEach(async (project) => {
        const exists = await pathExists(project.absolutePath);
        if (exists) {
          return;
        }

        const index = projects.indexOf(project);
        if (index !== -1) {
          projects.splice(index, 1);
          localStorage.setItem(projectsKey, JSON.stringify(projects));

          this.setState({
            projects,
          });
        }
      });
    } catch (e) {
      console.error(e);
    }

    await wait(150);

    ipcRenderer.send("dashboard:ready");
  }

  private async _checkSystemAvailabilities(): Promise<void> {
    await checkNodeJSAvailable();

    if (!nodeJSAvailable) {
      await showAlert(
        "未检测到 Node.js",
        <div className="flex flex-col">
          <div>您的系统中未找到 Node.js 环境。</div>
          <div>
            Node.js 是构建和运行项目所必需的。您可以按照{" "}
            <a className="underline transition-all duration-300 ease-in-out" onClick={() => shell.openExternal("https://nodejs.org/en/download")}>
              此链接
            </a>
            进行安装。
          </div>
        </div>
      ).wait();
    }
  }

  private async _handleAssociateProject(): Promise<void> {
    await this._checkSystemAvailabilities();
    if (!nodeJSAvailable) return;
    this.setState({ createProject: true });
  }

  private async _tryRemoveProjectFromLocalStorage(project: ProjectType): Promise<void> {
    const confirm = await showConfirm("删除项目", "确定要删除此项目吗？");
    if (!confirm) {
      return;
    }

    const index = this.state.projects.indexOf(project);
    if (index !== -1) {
      this.state.projects.splice(index, 1);

      localStorage.setItem(projectsKey, JSON.stringify(this.state.projects));

      this.setState({
        projects: tryGetProjectsFromLocalStorage(),
      });
    }
  }
}
