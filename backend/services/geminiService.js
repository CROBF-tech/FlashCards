import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from 'dotenv';

config();

class GeminiService {
    constructor() {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is required in environment variables');
        }

        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({
            model: 'gemini-2.0-flash-exp',
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 8192,
            },
        });
    }

    async generateFlashcardsFromText(text, options = {}) {
        const { cardCount = 10, difficulty = 'medium', language = 'es', focus = 'general' } = options;

        // Configuración específica para cada nivel de dificultad
        const difficultySettings = {
            easy: {
                instruction:
                    'Enfócate en conceptos básicos, definiciones simples y hechos directos. Las preguntas deben ser de respuesta directa.',
                questionTypes:
                    'definiciones básicas, identificación de términos, fechas importantes, conceptos simples',
                complexity: 'respuestas cortas y directas',
            },
            medium: {
                instruction:
                    'Combina conceptos básicos con aplicaciones prácticas. Incluye preguntas de comprensión y análisis moderado.',
                questionTypes:
                    'definiciones, ejemplos, comparaciones simples, aplicaciones básicas, relaciones causa-efecto',
                complexity: 'respuestas de longitud media con explicaciones claras',
            },
            hard: {
                instruction:
                    'Enfócate en análisis profundo, pensamiento crítico y aplicaciones complejas. Requiere razonamiento y síntesis.',
                questionTypes:
                    'análisis crítico, comparaciones complejas, aplicaciones avanzadas, evaluación de teorías, síntesis de conceptos',
                complexity: 'respuestas detalladas que requieren pensamiento analítico',
            },
        };

        // Configuración específica para cada enfoque
        const focusSettings = {
            general: {
                instruction: 'Extrae una variedad equilibrada de contenido del documento',
                priority: 'conceptos principales, definiciones importantes, datos relevantes, ejemplos clave',
            },
            definitions: {
                instruction: 'Prioriza términos técnicos, conceptos específicos y definiciones',
                priority: 'términos especializados, definiciones técnicas, conceptos teóricos, vocabulario específico',
            },
            facts: {
                instruction: 'Enfócate en datos concretos, fechas, cifras y hechos verificables',
                priority:
                    'fechas históricas, estadísticas, números importantes, datos cuantitativos, hechos específicos',
            },
            concepts: {
                instruction: 'Prioriza ideas principales, teorías y marcos conceptuales',
                priority: 'teorías fundamentales, marcos conceptuales, principios básicos, ideas centrales',
            },
        };

        const diffConfig = difficultySettings[difficulty];
        const focusConfig = focusSettings[focus];

        const prompt = `
Analiza el siguiente texto y genera exactamente ${cardCount} flashcards educativas en español.

TEXTO A ANALIZAR:
${text}

CONFIGURACIÓN DE DIFICULTAD (${difficulty.toUpperCase()}):
${diffConfig.instruction}
- Tipos de pregunta: ${diffConfig.questionTypes}
- Complejidad de respuesta: ${diffConfig.complexity}

CONFIGURACIÓN DE ENFOQUE (${focus.toUpperCase()}):
${focusConfig.instruction}
- Priorizar: ${focusConfig.priority}

INSTRUCCIONES ESPECÍFICAS:
- Genera exactamente ${cardCount} flashcards
- Nivel de dificultad: ${difficulty}
- Enfoque principal: ${focus}
- Las preguntas deben ser autocontenidas (no requieran el texto original)
- Adapta la complejidad según el nivel especificado
- Varía los tipos de pregunta según la dificultad configurada
- Para enfoque "definitions": Mínimo 70% preguntas de definición
- Para enfoque "facts": Mínimo 70% preguntas sobre datos/fechas/cifras
- Para enfoque "concepts": Mínimo 70% preguntas sobre teorías/principios
- Para enfoque "general": Distribución equilibrada de tipos

FORMATO DE RESPUESTA (JSON válido):
{
  "flashcards": [
    {
      "front": "Pregunta adaptada al nivel ${difficulty} con enfoque ${focus}",
      "back": "Respuesta con complejidad apropiada para ${difficulty}",
      "tags": ["tag1", "tag2", "dificultad:${difficulty}", "enfoque:${focus}"]
    }
  ]
}

IMPORTANTE: Responde ÚNICAMENTE con el JSON válido, sin texto adicional antes o después.
`;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const responseText = response.text();

            // Limpiar la respuesta y extraer solo el JSON
            const cleanedText = responseText.trim();
            let jsonText = cleanedText;

            // Remover posibles marcadores de código
            if (jsonText.startsWith('```json')) {
                jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (jsonText.startsWith('```')) {
                jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }

            // Parsear el JSON
            const parsedResponse = JSON.parse(jsonText);

            if (!parsedResponse.flashcards || !Array.isArray(parsedResponse.flashcards)) {
                throw new Error('Invalid response format from Gemini');
            }

            // Validar que se generó el número correcto de flashcards
            if (parsedResponse.flashcards.length !== cardCount) {
                console.warn(
                    `Se solicitaron ${cardCount} flashcards pero se generaron ${parsedResponse.flashcards.length}`
                );
            }

            return parsedResponse.flashcards;
        } catch (error) {
            console.error('Error generating flashcards with Gemini:', error);
            throw new Error(`Failed to generate flashcards: ${error.message}`);
        }
    }

    async enhanceFlashcard(front, back) {
        const prompt = `
Mejora esta flashcard manteniendo su contenido principal pero haciéndola más clara y educativa:

PREGUNTA ACTUAL: ${front}
RESPUESTA ACTUAL: ${back}

INSTRUCCIONES:
- Mantén el contenido esencial
- Mejora la claridad y precisión
- Hazla más educativa si es posible
- Mantén un lenguaje apropiado y formal

FORMATO DE RESPUESTA (JSON válido):
{
  "front": "Pregunta mejorada",
  "back": "Respuesta mejorada",
  "tags": ["tag1", "tag2", "tag3"]
}

IMPORTANTE: Responde ÚNICAMENTE con el JSON válido.
`;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            const cleanedText = text.trim();
            let jsonText = cleanedText;

            if (jsonText.startsWith('```json')) {
                jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (jsonText.startsWith('```')) {
                jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }

            return JSON.parse(jsonText);
        } catch (error) {
            console.error('Error enhancing flashcard with Gemini:', error);
            throw new Error(`Failed to enhance flashcard: ${error.message}`);
        }
    }
}

export default new GeminiService();
