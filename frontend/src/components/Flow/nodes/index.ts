import { TableNode } from './TableNode';

export const nodeTypes = {
  default: TableNode,
  source: TableNode,
  dimension: TableNode,
  fact: TableNode,
  hub: TableNode,
  link: TableNode,
  satellite: TableNode,
  table: TableNode,
};

export { TableNode };
