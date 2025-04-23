// App.js
import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "./screens/HomeScreen";
import DeckScreen from "./screens/DeckScreen";
import StudyScreen from "./screens/StudyScreen";
import AddEditDeckScreen from "./screens/AddEditDeckScreen";
import AddEditCardScreen from "./screens/AddEditCardScreen";
import SearchScreen from "./screens/SearchScreen";
import StatsScreen from "./screens/StatsScreen";

const Stack = createNativeStackNavigator();

export default function App() {
    return (
        <NavigationContainer>
            <Stack.Navigator initialRouteName="Home">
                <Stack.Screen
                    name="Home"
                    component={HomeScreen}
                    options={{ title: "Mis Mazos" }}
                />
                <Stack.Screen
                    name="Deck"
                    component={DeckScreen}
                    options={({ route }) => ({ title: route.params.deckName })}
                />
                <Stack.Screen
                    name="Study"
                    component={StudyScreen}
                    options={{ title: "Estudiar" }}
                />
                <Stack.Screen
                    name="AddEditDeck"
                    component={AddEditDeckScreen}
                    options={({ route }) => ({
                        title: route.params?.deck
                            ? "Editar Mazo"
                            : "Nuevo Mazo",
                    })}
                />
                <Stack.Screen
                    name="AddEditCard"
                    component={AddEditCardScreen}
                    options={({ route }) => ({
                        title: route.params?.card
                            ? "Editar Tarjeta"
                            : "Nueva Tarjeta",
                    })}
                />
                <Stack.Screen
                    name="Search"
                    component={SearchScreen}
                    options={{ title: "Buscar" }}
                />
                <Stack.Screen
                    name="Stats"
                    component={StatsScreen}
                    options={{ title: "Estadísticas" }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
}
