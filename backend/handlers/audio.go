package handlers

import (
	"bytes"
	"encoding/binary"
	"math"
	"net/http"
)

// GenerateChimeWAV creates an acoustic announcement chime + tone sequence in pure PCM WAV
func GenerateChimeWAV() []byte {
	sampleRate := 44100
	durationSeconds := 2.5
	numSamples := int(float64(sampleRate) * durationSeconds)

	var buf bytes.Buffer

	// RIFF Header
	buf.WriteString("RIFF")
	binary.Write(&buf, binary.LittleEndian, uint32(36+numSamples*2))
	buf.WriteString("WAVE")

	// fmt subchunk
	buf.WriteString("fmt ")
	binary.Write(&buf, binary.LittleEndian, uint32(16)) // Subchunk1Size (16 for PCM)
	binary.Write(&buf, binary.LittleEndian, uint16(1))  // AudioFormat (1 for PCM)
	binary.Write(&buf, binary.LittleEndian, uint16(1))  // NumChannels (1 mono)
	binary.Write(&buf, binary.LittleEndian, uint32(sampleRate))
	binary.Write(&buf, binary.LittleEndian, uint32(sampleRate*2)) // ByteRate
	binary.Write(&buf, binary.LittleEndian, uint16(2))            // BlockAlign
	binary.Write(&buf, binary.LittleEndian, uint16(16))           // BitsPerSample

	// data subchunk
	buf.WriteString("data")
	binary.Write(&buf, binary.LittleEndian, uint32(numSamples*2))

	// Generate three resonant chords (E4 - G#4 - B4) representing library chime
	freqs := []float64{329.63, 415.30, 493.88}
	for i := 0; i < numSamples; i++ {
		t := float64(i) / float64(sampleRate)
		decay := math.Exp(-t * 1.8)

		var sampleVal float64
		for _, f := range freqs {
			sampleVal += math.Sin(2*math.Pi*f*t) * 0.3
		}
		sampleVal *= decay

		sample16 := int16(sampleVal * 32767.0)
		binary.Write(&buf, binary.LittleEndian, sample16)
	}

	return buf.Bytes()
}

// ServeAudioHandler serves the chime WAV or test audio
func ServeAudioHandler(w http.ResponseWriter, r *http.Request) {
	wavBytes := GenerateChimeWAV()
	w.Header().Set("Content-Type", "audio/wav")
	w.Header().Set("Cache-Control", "public, max-age=86400")
	w.Header().Set("Content-Length", string(rune(len(wavBytes))))
	w.Write(wavBytes)
}
