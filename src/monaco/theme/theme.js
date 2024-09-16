import { Setting } from "../../setting.js";
import { diffEditor } from "../monaco_root.js";
//https://github.com/brijeshb42/monaco-themes/

let $metaColor = document.querySelector('meta[name="theme-color"]');

export const theme_blackSetting = () => {
  $metaColor.setAttribute('content', '#2D2D2D');
  document.documentElement.style.setProperty('--backgroundColor', '#2D2D2D');
  document.documentElement.style.setProperty('--font-color', '#EFF5F5');
  document.documentElement.style.setProperty('color-scheme', 'dark');
  var elements = document.getElementsByTagName('img');
  for (let i = 0; i < elements.length; i++) {
    elements[i].style.filter = "invert(100%) grayscale(30%)";
  }
}

export const theme_whiteSetting = () => {
  $metaColor.setAttribute('content', '#EFF5F5');
  document.documentElement.style.setProperty('--backgroundColor', '#EFF5F5');
  document.documentElement.style.setProperty('--font-color', 'black');
  document.documentElement.style.setProperty('color-scheme', 'normal');
  var elements = document.getElementsByTagName('img');
  for (let i = 0; i < elements.length; i++) {
    elements[i].style.filter = "";
  }
}

export const themeCSS_FilterStyle = () => {
  if (Setting.getThemeType === 'black') {
    return 'invert(100%) grayscale(30%)';
  }
  return '';
}

export const fetchJSON_Read = async (path) => {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error("HTTP error " + response.status);
    }
    const json = await response.json();
    return json;
  } catch (error) {
    console.log("Fetch error: ", error);
  }
}

const extraThemeChange = document.getElementById('control-extraTheme');
extraThemeChange.addEventListener('click', () => { themeApply((Setting.getTheme) + 1) });
export const themeApply = async (themeState) => {
  switch (themeState) {
    case 1:
      //white
      theme_whiteSetting();
      monaco.editor.defineTheme('myTheme', await fetchJSON_Read("./src/monaco/theme/white.json"));
      break;
    default:
      theme_blackSetting();
      monaco.editor.defineTheme('myTheme', await fetchJSON_Read("./src/monaco/theme/dark_1.json"));
      themeState = 0;
  }
  Setting.setTheme = themeState;
}

const diffViewChange = document.getElementById('control-diffViewChange');
diffViewChange.addEventListener('click', (event) => { themeDiffApply(event.target.checked) });
export const themeDiffApply = (themeState) => {
  diffEditor.updateOptions({ renderSideBySide: themeState });
  Setting.setDiffTheme = themeState;
}