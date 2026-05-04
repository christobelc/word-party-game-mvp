import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ServicesProvider } from "./core/ServicesProvider";
import { services } from "./core/services";
import { HomeScreen } from "./ui/screens/HomeScreen";
import { DeckEditorScreen } from "./ui/screens/DeckEditorScreen";
import { LobbyScreen } from "./ui/screens/LobbyScreen";
import { PlayScreen } from "./ui/screens/PlayScreen";
import { ResultsScreen } from "./ui/screens/ResultsScreen";
import './games';

export default function App(): React.ReactElement {
  return (
    <ServicesProvider services={services}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/decks/:id/edit" element={<DeckEditorScreen />} />
          <Route path="/lobby" element={<LobbyScreen />} />
          <Route path="/play" element={<PlayScreen />} />
          <Route path="/results" element={<ResultsScreen />} />
        </Routes>
      </BrowserRouter>
    </ServicesProvider>
  );
}
