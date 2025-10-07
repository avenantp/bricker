import FragmentNode from './FragmentNode';
import ConditionNode from './ConditionNode';
import StartEndNode from './StartEndNode';
import MergeNode from './MergeNode';
import CodeFragmentNode from './CodeFragmentNode';

export const nodeTypes = {
  fragment: FragmentNode,
  condition: ConditionNode,
  start: StartEndNode,
  end: StartEndNode,
  merge: MergeNode,
  codeFragment: CodeFragmentNode,
};

export { FragmentNode, ConditionNode, StartEndNode, MergeNode, CodeFragmentNode };
