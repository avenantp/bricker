import FragmentNode from './FragmentNode';
import ConditionNode from './ConditionNode';
import StartEndNode from './StartEndNode';
import MergeNode from './MergeNode';

export const nodeTypes = {
  fragment: FragmentNode,
  condition: ConditionNode,
  start: StartEndNode,
  end: StartEndNode,
  merge: MergeNode,
};

export { FragmentNode, ConditionNode, StartEndNode, MergeNode };
