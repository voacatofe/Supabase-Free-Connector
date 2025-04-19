/**
 * @file validateTooltipConsistency.test.ts
 * @description Utilitário para testar a validação de consistência entre tooltips e transformações
 * 
 * Em vez de usar o framework de testes Jest diretamente, este arquivo fornece
 * funções de teste que podem ser executadas manualmente ou integradas a qualquer
 * framework de testes.
 */

import { FieldType } from '../types';
import { 
  validateTransformationConsistency,
  validateAllTransformations 
} from '../utils/validateTransformations';
import { validateTransformationsAgainstTooltips } from '../utils/validateTooltipConsistency';
import { TYPE_DESCRIPTIONS } from '../utils/transformUtils';

/**
 * Verifica se as descrições dos tooltips estão definidas para todos os tipos
 * @returns Um objeto com o resultado do teste
 */
export function testToolTipDescriptions() {
  const fieldTypes: FieldType[] = [
    'string', 'number', 'boolean', 'date', 'color', 'formattedText',
    'image', 'file', 'link', 'enum', 'collectionReference', 'multiCollectionReference',
    'object', 'array'
  ];
  
  const results = [];
  let allValid = true;
  
  for (const type of fieldTypes) {
    // Tipos 'object' e 'array' estão no FieldType mas não nos tooltips,
    // pois são tipos internos que não são expostos na interface
    if (type !== 'object' && type !== 'array') {
      const hasProperty = type in TYPE_DESCRIPTIONS;
      const hasValue = TYPE_DESCRIPTIONS[type as keyof typeof TYPE_DESCRIPTIONS] ? true : false;
      
      if (!hasProperty || !hasValue) {
        allValid = false;
      }
      
      results.push({
        type,
        hasProperty,
        hasValue,
        valid: hasProperty && hasValue
      });
    }
  }
  
  return {
    name: 'Verificação de descrições de tooltip',
    allValid,
    results
  };
}

/**
 * Testa transformações específicas para verificar consistência com tooltips
 * @returns Objeto com resultados dos testes
 */
export function testSpecificTransformations() {
  const tests = [
    {
      name: 'Transformação de string',
      type: 'string' as FieldType,
      value: 123,
      expectedType: 'string'
    },
    {
      name: 'Transformação de number válida',
      type: 'number' as FieldType,
      value: '123.45',
      expectedType: 'number'
    },
    {
      name: 'Transformação de number inválida',
      type: 'number' as FieldType,
      value: 'abc',
      expectedType: 'number',
      expectedValue: 0
    },
    {
      name: 'Transformação de boolean de string "true"',
      type: 'boolean' as FieldType,
      value: 'true',
      expectedType: 'boolean',
      expectedValue: true
    },
    {
      name: 'Transformação de boolean de string "sim"',
      type: 'boolean' as FieldType,
      value: 'sim',
      expectedType: 'boolean',
      expectedValue: true
    },
    {
      name: 'Transformação de date válida',
      type: 'date' as FieldType,
      value: '2023-01-01',
      validationFn: (value: any) => typeof value === 'string' && !isNaN(Date.parse(value))
    },
    {
      name: 'Transformação de date inválida',
      type: 'date' as FieldType,
      value: 'invalid-date',
      expectedValue: null
    }
  ];
  
  const results = [];
  let allValid = true;
  
  for (const test of tests) {
    const result = validateTransformationConsistency(test.type, test.value);
    let testPassed = result.valid;
    
    if (test.expectedType) {
      testPassed = testPassed && typeof result.details.transformedValue === test.expectedType;
    }
    
    if ('expectedValue' in test) {
      const expectedValue = (test as any).expectedValue;
      testPassed = testPassed && result.details.transformedValue === expectedValue;
    }
    
    if (test.validationFn) {
      testPassed = testPassed && test.validationFn(result.details.transformedValue);
    }
    
    if (!testPassed) {
      allValid = false;
    }
    
    results.push({
      name: test.name,
      passed: testPassed,
      details: result.details
    });
  }
  
  return {
    name: 'Testes de transformações específicas',
    allValid,
    results
  };
}

/**
 * Testa valores nulos e indefinidos para todos os tipos
 * @returns Objeto com resultados dos testes
 */
export function testNullAndUndefinedValues() {
  const fieldTypes: FieldType[] = [
    'string', 'number', 'boolean', 'date', 'color', 'formattedText',
    'image', 'file', 'link', 'enum', 'collectionReference', 'multiCollectionReference',
    'object', 'array'
  ];
  
  const results = [];
  let allValid = true;
  
  for (const type of fieldTypes) {
    const nullResult = validateTransformationConsistency(type, null);
    const undefinedResult = validateTransformationConsistency(type, undefined);
    
    const nullValid = nullResult.valid;
    const undefinedValid = undefinedResult.valid;
    
    if (!nullValid || !undefinedValid) {
      allValid = false;
    }
    
    results.push({
      type,
      nullValid,
      undefinedValid,
      valid: nullValid && undefinedValid
    });
  }
  
  return {
    name: 'Teste de valores nulos e indefinidos',
    allValid,
    results
  };
}

/**
 * Executa todos os testes de validação
 * @returns Resumo dos resultados de todos os testes
 */
export function runAllTests() {
  const toolTipTest = testToolTipDescriptions();
  const specificTransformationsTest = testSpecificTransformations();
  const nullUndefinedTest = testNullAndUndefinedValues();
  const validationResults = validateTransformationsAgainstTooltips();
  
  return {
    allTestsPassed: 
      toolTipTest.allValid && 
      specificTransformationsTest.allValid && 
      nullUndefinedTest.allValid,
    allTransformationsValid: validationResults.allValid,
    tests: [
      toolTipTest,
      specificTransformationsTest,
      nullUndefinedTest
    ],
    validationReport: validationResults.report
  };
}

// Se for executado diretamente (não importado como módulo)
if (require.main === module) {
  console.log('Executando testes de validação...');
  const results = runAllTests();
  
  console.log(`\nResultado dos testes: ${results.allTestsPassed ? 'SUCESSO' : 'FALHA'}`);
  console.log(`Validação de transformações: ${results.allTransformationsValid ? 'CONSISTENTE' : 'INCONSISTENTE'}`);
  
  console.log('\n=== Resumo dos Testes ===');
  results.tests.forEach(test => {
    console.log(`${test.name}: ${test.allValid ? 'PASSOU' : 'FALHOU'}`);
  });
  
  console.log('\n=== Detalhes do Relatório de Validação ===');
  console.log(results.validationReport);
} 