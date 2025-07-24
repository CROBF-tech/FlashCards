import { ScrollView, Text, View, StyleSheet } from 'react-native';

export default function PrivacyPolicyScreen() {
    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.card}>
                <Text style={styles.title}>Política de Privacidad — CROBF Flashcards</Text>
                <Text style={styles.update}>
                    <Text style={styles.bold}>Última actualización:</Text> 03/06/2025
                </Text>

                <Text style={styles.sectionTitle}>1. Información que recopilamos</Text>
                <Text style={styles.paragraph}>La aplicación únicamente almacena la siguiente información:</Text>
                <View style={styles.list}>
                    <Text style={styles.listItem}>• Nombre de usuario</Text>
                    <Text style={styles.listItem}>• Dirección de correo electrónico</Text>
                    <Text style={styles.listItem}>
                        • Contenido creado por el usuario (tarjetas de estudio/flashcards)
                    </Text>
                </View>

                <Text style={styles.sectionTitle}>2. Finalidad del tratamiento</Text>
                <Text style={styles.paragraph}>Estos datos se utilizan exclusivamente para:</Text>
                <View style={styles.list}>
                    <Text style={styles.listItem}>• Permitir el acceso personalizado a la cuenta del usuario</Text>
                    <Text style={styles.listItem}>• Almacenar y sincronizar el contenido creado (tarjetas)</Text>
                    <Text style={styles.listItem}>• Mejorar la experiencia dentro de la plataforma</Text>
                </View>
                <Text style={[styles.paragraph, styles.bold]}>
                    No utilizamos los datos para fines publicitarios, comerciales ni de análisis de terceros.
                </Text>

                <Text style={styles.sectionTitle}>3. Confidencialidad y no divulgación</Text>
                <Text style={styles.paragraph}>
                    Toda la información almacenada es <Text style={styles.bold}>estrictamente confidencial</Text>.{' '}
                    <Text style={styles.bold}>No se vende, no se comparte ni se publica</Text> bajo ninguna
                    circunstancia. El contenido y los datos personales permanecen{' '}
                    <Text style={styles.bold}>100% privados</Text> y bajo control exclusivo del usuario.
                </Text>

                <Text style={styles.sectionTitle}>4. Seguridad de los datos</Text>
                <Text style={styles.paragraph}>
                    Implementamos medidas técnicas y organizativas adecuadas para proteger la información contra accesos
                    no autorizados, pérdidas o alteraciones. No obstante, ningún sistema es completamente infalible, por
                    lo que instamos a los usuarios a utilizar contraseñas seguras y mantener la confidencialidad de sus
                    credenciales.
                </Text>

                <Text style={styles.sectionTitle}>5. Derechos del usuario</Text>
                <Text style={styles.paragraph}>El usuario podrá, en cualquier momento:</Text>
                <View style={styles.list}>
                    <Text style={styles.listItem}>• Acceder a sus datos personales</Text>
                    <Text style={styles.listItem}>• Modificar o eliminar su información y tarjetas</Text>
                    <Text style={styles.listItem}>
                        • Solicitar la eliminación completa de su cuenta y datos asociados
                    </Text>
                </View>
                <Text style={styles.paragraph}>
                    Para ejercer estos derechos, puede escribirnos a:{' '}
                    <Text style={styles.italic}>crobf.arg@gmail.com</Text>
                </Text>

                <Text style={styles.sectionTitle}>6. Cambios en esta política</Text>
                <Text style={styles.paragraph}>
                    Nos reservamos el derecho de modificar esta política para reflejar cambios legales o mejoras en el
                    servicio. En caso de cambios significativos, notificaremos a los usuarios mediante la plataforma.
                </Text>

                <Text style={styles.sectionTitle}>Contacto</Text>
                <Text style={styles.paragraph}>
                    Si tienes preguntas o inquietudes sobre esta política, puedes contactarnos a:{'\n'}
                    <Text style={styles.bold}>CROBF — [correo electrónico oficial]</Text>
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        alignItems: 'center',
        backgroundColor: '#f9fafb',
    },
    card: {
        maxWidth: 800,
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 24,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 5,
    },
    title: {
        fontSize: 24,
        color: '#1a202c',
        fontWeight: 'bold',
        marginBottom: 12,
    },
    update: {
        fontSize: 14,
        color: '#4a5568',
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        color: '#2d3748',
        fontWeight: '600',
        marginTop: 24,
        marginBottom: 8,
    },
    paragraph: {
        fontSize: 16,
        color: '#4a5568',
        marginTop: 8,
        lineHeight: 22,
    },
    list: {
        marginLeft: 16,
        marginTop: 8,
    },
    listItem: {
        fontSize: 16,
        color: '#4a5568',
        marginVertical: 4,
    },
    bold: {
        fontWeight: 'bold',
    },
    italic: {
        fontStyle: 'italic',
    },
});
