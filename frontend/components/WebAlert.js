// components/WebAlert.js
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { theme } from '../theme';

// Componente de alerta personalizado que funciona en todas las plataformas
export const WebAlert = {
  alert: (title, message, buttons = [{ text: 'OK' }]) => {
    // En plataformas nativas, usar el Alert nativo
    if (Platform.OS !== 'web') {
      const { Alert } = require('react-native');
      Alert.alert(title, message, buttons);
      return;
    }
    
    // En web, mostrar nuestro modal personalizado
    const AlertComponent = ({ title, message, buttons }) => {
      const [visible, setVisible] = useState(true);

      const handleButtonPress = (button) => {
        setVisible(false);
        if (button.onPress) {
          setTimeout(() => {
            button.onPress();
          }, 300);
        }
      };

      return (
        <Modal
          transparent={true}
          visible={visible}
          animationType="fade"
          onRequestClose={() => setVisible(false)}
        >
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              {title && <Text style={styles.modalTitle}>{title}</Text>}
              {message && <Text style={styles.modalText}>{message}</Text>}
              <View style={styles.buttonContainer}>
                {buttons.map((button, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.button,
                      button.style === 'destructive' && styles.destructiveButton,
                      button.style === 'cancel' && styles.cancelButton,
                      index > 0 && styles.buttonMargin
                    ]}
                    onPress={() => handleButtonPress(button)}
                  >
                    <Text 
                      style={[
                        styles.buttonText,
                        button.style === 'destructive' && styles.destructiveButtonText,
                        button.style === 'cancel' && styles.cancelButtonText
                      ]}
                    >
                      {button.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Modal>
      );
    };

    // Crear un div para el modal y renderizar el componente
    const alertContainer = document.createElement('div');
    alertContainer.id = 'web-alert-container';
    document.body.appendChild(alertContainer);

    // Importar ReactDOM dinámicamente solo en web
    const ReactDOM = require('react-dom');
    ReactDOM.render(
      <AlertComponent title={title} message={message} buttons={buttons} />,
      alertContainer
    );

    // Función para limpiar el modal
    const cleanup = () => {
      setTimeout(() => {
        ReactDOM.unmountComponentAtNode(alertContainer);
        document.body.removeChild(alertContainer);
      }, 500);
    };

    // Limpiar después de un tiempo o cuando se presione un botón
    setTimeout(cleanup, 60000); // Timeout de seguridad

    // Devolver una función para cerrar manualmente
    return cleanup;
  }
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: theme.colors.background.card,
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 300,
    maxWidth: '80%',
  },
  modalTitle: {
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 18,
    color: theme.colors.text.primary,
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
    color: theme.colors.text.primary,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  button: {
    borderRadius: 5,
    padding: 10,
    elevation: 2,
    backgroundColor: theme.colors.primary,
    minWidth: 80,
    marginHorizontal: 5,
  },
  buttonMargin: {
    marginLeft: 10,
  },
  destructiveButton: {
    backgroundColor: theme.colors.danger,
  },
  cancelButton: {
    backgroundColor: theme.colors.background.elevated,
  },
  buttonText: {
    color: theme.colors.text.primary,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  destructiveButtonText: {
    color: 'white',
  },
  cancelButtonText: {
    color: theme.colors.text.primary,
  },
});

export default WebAlert;