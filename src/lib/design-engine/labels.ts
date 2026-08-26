import type { ModuleType } from "./types";
import type { Orientation, PanelRole } from "./panels";

export const MODULE_TYPE_LABELS: Record<ModuleType, string> = {
  shelf: "Estante",
  drawer: "Cajón",
  doors: "Puertas dobles",
  "left-door": "Puerta izquierda",
  "right-door": "Puerta derecha",
  multiple: "Patrón repetido",
  "hanging-rod": "Barral colgador",
  open: "Espacio abierto",
  legs: "Patas / base",
  "top-moulding": "Moldura superior",
  "bottom-moulding": "Zócalo inferior",
};

export const PANEL_ROLE_LABELS: Record<PanelRole, string> = {
  "back-panel": "Panel trasero",
  "side-panel": "Lateral",
  shelf: "Estante / tapa",
  "door-front": "Frente de puerta",
  "drawer-front": "Frente de cajón",
  "drawer-back": "Fondo trasero de cajón",
  "drawer-side": "Costado de cajón",
  "drawer-bottom": "Piso de cajón",
  "top-moulding": "Moldura superior",
  "bottom-moulding": "Zócalo inferior",
  "hanging-rod": "Barral colgador",
  legs: "Pata",
};

export const ORIENTATION_LABELS: Record<Orientation, string> = {
  "vertical-xy": "vertical-xy",
  "horizontal-xz": "horizontal-xz",
  "vertical-yz": "vertical-yz",
  rod: "barral",
  hardware: "herraje",
};
