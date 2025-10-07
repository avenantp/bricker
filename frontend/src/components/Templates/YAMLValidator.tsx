import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, Play, FileText, X } from 'lucide-react';
import Editor from '@monaco-editor/react';
import {
  validateCompositionYAML,
  validateFragmentYAML,
  autoFixYAML,
  ValidationResult,
  ValidationError,
} from '../../services/yaml-validator';
import { compositionToYAML, fragmentToYAML } from '../../services/template-clone-service';
import { TemplateComposition, TemplateFragment } from '../../types/template';

interface YAMLValidatorProps {
  composition?: TemplateComposition;
  fragment?: TemplateFragment;
  compiledTemplate?: string;
  isDevMode: boolean;
  onClose: () => void;
}

export default function YAMLValidator({
  composition,
  fragment,
  compiledTemplate,
  isDevMode,
  onClose,
}: YAMLValidatorProps) {
  const [yamlContent, setYamlContent] = useState('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showErrors, setShowErrors] = useState(true);
  const [showWarnings, setShowWarnings] = useState(true);

  // Generate YAML on mount
  useEffect(() => {
    if (composition) {
      const yaml = compositionToYAML(composition, compiledTemplate);
      setYamlContent(yaml);
      validateYAML(yaml, 'composition');
    } else if (fragment) {
      const yaml = fragmentToYAML(fragment);
      setYamlContent(yaml);
      validateYAML(yaml, 'fragment');
    }
  }, [composition, fragment, compiledTemplate]);

  const validateYAML = (content: string, type: 'composition' | 'fragment') => {
    setIsValidating(true);
    setTimeout(() => {
      const result =
        type === 'composition'
          ? validateCompositionYAML(content)
          : validateFragmentYAML(content);
      setValidationResult(result);
      setIsValidating(false);
    }, 300);
  };

  const handleValidate = () => {
    const type = composition ? 'composition' : 'fragment';
    validateYAML(yamlContent, type);
  };

  const handleAutoFix = () => {
    const fixed = autoFixYAML(yamlContent);
    setYamlContent(fixed);
    const type = composition ? 'composition' : 'fragment';
    validateYAML(fixed, type);
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      setYamlContent(value);
    }
  };

  const renderValidationItem = (item: ValidationError, index: number) => {
    const isError = item.severity === 'error';

    return (
      <div
        key={index}
        className={`
          p-3 rounded-lg border
          ${isError ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}
        `}
      >
        <div className="flex items-start gap-2">
          {isError ? (
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
          )}
          <div className="flex-1">
            <p className={`text-sm font-medium ${isError ? 'text-red-900' : 'text-yellow-900'}`}>
              {item.field}
            </p>
            <p className={`text-xs mt-1 ${isError ? 'text-red-700' : 'text-yellow-700'}`}>
              {item.message}
            </p>
            {item.line && (
              <p className={`text-xs mt-1 ${isError ? 'text-red-600' : 'text-yellow-600'}`}>
                Line {item.line}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">YAML Validator</h2>
              <p className="text-sm text-gray-500">
                {composition ? 'Template Composition' : 'Template Fragment'}
                {!isDevMode && (
                  <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">
                    Dev Mode Required
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleValidate}
              disabled={isValidating || !isDevMode}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Play className="w-4 h-4" />
              Validate
            </button>

            {validationResult && !validationResult.isValid && isDevMode && (
              <button
                onClick={handleAutoFix}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Auto-Fix
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* YAML Editor */}
          <div className="flex-1 border-r border-gray-200">
            <div className="h-full flex flex-col">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                <p className="text-xs font-medium text-gray-700">YAML Content</p>
              </div>
              <div className="flex-1 overflow-hidden">
                <Editor
                  height="100%"
                  language="yaml"
                  value={yamlContent}
                  onChange={handleEditorChange}
                  theme="vs-light"
                  options={{
                    readOnly: !isDevMode,
                    minimap: { enabled: true },
                    fontSize: 12,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Validation Results */}
          <div className="w-96 overflow-y-auto">
            <div className="p-4">
              {/* Validation Status */}
              {validationResult && (
                <div
                  className={`
                    mb-4 p-4 rounded-lg border-2
                    ${
                      validationResult.isValid
                        ? 'bg-green-50 border-green-300'
                        : 'bg-red-50 border-red-300'
                    }
                  `}
                >
                  <div className="flex items-center gap-2">
                    {validationResult.isValid ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="font-semibold text-green-900">Valid YAML</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <span className="font-semibold text-red-900">Validation Failed</span>
                      </>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-gray-600">
                    <p>{validationResult.errors.length} errors</p>
                    <p>{validationResult.warnings.length} warnings</p>
                  </div>
                </div>
              )}

              {/* Errors */}
              {validationResult && validationResult.errors.length > 0 && (
                <div className="mb-4">
                  <button
                    onClick={() => setShowErrors(!showErrors)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-red-100 hover:bg-red-200 rounded-lg transition-colors mb-2"
                  >
                    <span className="text-sm font-semibold text-red-900">
                      Errors ({validationResult.errors.length})
                    </span>
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  </button>

                  {showErrors && (
                    <div className="space-y-2">
                      {validationResult.errors.map(renderValidationItem)}
                    </div>
                  )}
                </div>
              )}

              {/* Warnings */}
              {validationResult && validationResult.warnings.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowWarnings(!showWarnings)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-yellow-100 hover:bg-yellow-200 rounded-lg transition-colors mb-2"
                  >
                    <span className="text-sm font-semibold text-yellow-900">
                      Warnings ({validationResult.warnings.length})
                    </span>
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  </button>

                  {showWarnings && (
                    <div className="space-y-2">
                      {validationResult.warnings.map(renderValidationItem)}
                    </div>
                  )}
                </div>
              )}

              {/* No Issues */}
              {validationResult &&
                validationResult.errors.length === 0 &&
                validationResult.warnings.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                    <p className="text-sm">No issues found!</p>
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <div>
              {!isDevMode && (
                <p className="text-yellow-600 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Enable Dev Mode to edit and validate YAML
                </p>
              )}
            </div>
            <div>Lines: {yamlContent.split('\n').length}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
