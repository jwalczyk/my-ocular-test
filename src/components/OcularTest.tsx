"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Types
type Point = {
  x: number;
  y: number;
  seen: boolean;
};

// Constants
const GRID_SIZE = 20;
const TEST_DURATION = 5000;
const STEP_SIZE = 3;

// Initial focal points for each test
const FOCAL_POINTS = {
  1: { x: 4, y: 4 },   // Q1
  2: { x: 15, y: 5 },  // Q2
  3: { x: 15, y: 15 }, // Q3
  4: { x: 5, y: 15 },  // Q4
};

// Initial secondary dot positions for each test
const INITIAL_SECONDARY_POSITIONS = {
  1: { x: 15, y: 15 }, // Q3 bottom right
  2: { x: 5, y: 15 },  // Q4 bottom left
  3: { x: 5, y: 5 },   // Q1 top left
  4: { x: 15, y: 5 },  // Q2 top right
};

const OcularTest = () => {
  const [currentTest, setCurrentTest] = useState(1);
  const [testActive, setTestActive] = useState(false);
  const [focalPoint, setFocalPoint] = useState<Point>({ x: 4, y: 4, seen: true });
  const [secondaryPoint, setSecondaryPoint] = useState<Point>({ x: 15, y: 15, seen: false });
  const [timeLeft, setTimeLeft] = useState(TEST_DURATION);
  const [showSecondaryDot, setShowSecondaryDot] = useState(true);
  const [testedPoints, setTestedPoints] = useState<Point[]>([]);
  const [currentLine, setCurrentLine] = useState<{ start: Point; end: Point } | null>(null);
  const [radius] = useState(8); // Initial radius for semi-circle

  // Timer effect
  useEffect(() => {
    if (testActive && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 100);
      }, 100);
      return () => clearInterval(timer);
    } else if (timeLeft <= 0 && testActive) {
      handleTimeout();
    }
  }, [testActive, timeLeft]);

  // Calculate next point along current line
  const calculateNextLinearPoint = useCallback(() => {
    if (!currentLine) return null;
    
    const dx = currentLine.end.x - currentLine.start.x;
    const dy = currentLine.end.y - currentLine.start.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance <= STEP_SIZE) return currentLine.end;
    
    const ratio = (distance - STEP_SIZE) / distance;
    const newPoint = {
      x: Math.round(currentLine.end.x - dx * ratio),
      y: Math.round(currentLine.end.y - dy * ratio),
      seen: false
    };
  
    // Constrain the point to stay within grid boundaries
    return constrainToGrid(newPoint);
  }, [currentLine]);

  const constrainToGrid = (point: Point): Point => {
    return {
      x: Math.max(0, Math.min(GRID_SIZE - 1, point.x)),
      y: Math.max(0, Math.min(GRID_SIZE - 1, point.y)),
      seen: point.seen
    };
  };

  // Calculate next semi-circle point
  const calculateNextSemiCirclePoint = useCallback(() => {
    // Generate random angle in the appropriate quadrant
    let angle;
    switch(currentTest) {
      case 1: angle = Math.PI * (1.25 + Math.random() * 0.5); break; // Q1
      case 2: angle = Math.PI * (1.75 + Math.random() * 0.5); break; // Q2
      case 3: angle = Math.PI * (0.25 + Math.random() * 0.5); break; // Q3
      case 4: angle = Math.PI * (0.75 + Math.random() * 0.5); break; // Q4
      default: angle = Math.random() * Math.PI;
    }
  
    const newPoint = {
      x: Math.round(focalPoint.x + radius * Math.cos(angle)),
      y: Math.round(focalPoint.y + radius * Math.sin(angle)),
      seen: false
    };
  
    // Constrain the point to stay within grid boundaries
    return constrainToGrid(newPoint);
  }, [currentTest, focalPoint, radius]);

  // Blink effect
  useEffect(() => {
    if (testActive) {
      const blinkInterval = setInterval(() => {
        setShowSecondaryDot(prev => !prev);
      }, 500);
      return () => clearInterval(blinkInterval);
    }
  }, [testActive]);

  const handleTimeout = useCallback(() => {
    // Record current point as unseen
    const updatedPoint = { ...secondaryPoint, seen: false };
    setTestedPoints(prev => [...prev, updatedPoint]);

    // Calculate next point along the line
    const nextPoint = calculateNextLinearPoint();
    if (nextPoint) {
      setSecondaryPoint(nextPoint);
      setTimeLeft(TEST_DURATION);
    }
  }, [secondaryPoint, calculateNextLinearPoint]);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (event.code === 'Space' && testActive) {
      // Record current point as seen
      const updatedPoint = { ...secondaryPoint, seen: true };
      setTestedPoints(prev => [...prev, updatedPoint]);

      // Calculate next semi-circle point
      const nextPoint = calculateNextSemiCirclePoint();
      if (nextPoint) {
        setSecondaryPoint(nextPoint);
        setCurrentLine({
          start: nextPoint,
          end: focalPoint
        });
        setTimeLeft(TEST_DURATION);
      }
    }
  }, [testActive, secondaryPoint, calculateNextSemiCirclePoint, focalPoint]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  const startTest = (testNumber: number) => {
    const newFocalPoint = { ...FOCAL_POINTS[testNumber as keyof typeof FOCAL_POINTS], seen: true };
    const initialSecondary = { 
      ...INITIAL_SECONDARY_POSITIONS[testNumber as keyof typeof INITIAL_SECONDARY_POSITIONS], 
      seen: false 
    };
    
    setCurrentTest(testNumber);
    setFocalPoint(newFocalPoint);
    setSecondaryPoint(initialSecondary);
    setTestedPoints([]);
    setTimeLeft(TEST_DURATION);
    setTestActive(true);
    setCurrentLine({
      start: initialSecondary,
      end: newFocalPoint
    });
  };

  return (
    <Card className="w-full max-w-4xl mx-auto my-8">
      <CardContent className="p-6">
        <div className="mb-4">
          <h2 className="text-2xl font-bold mb-4">Ocular Test</h2>
          <div className="flex gap-2 mb-4">
            {[1, 2, 3, 4].map(testNum => (
              <Button 
                key={testNum}
                onClick={() => startTest(testNum)}
                disabled={testActive}
                className="px-4 py-2"
              >
                Start Test {testNum}
              </Button>
            ))}
          </div>
          {testActive && (
            <div className="mb-4">
              <div className="h-2 bg-gray-200 rounded">
                <div 
                  className="h-2 bg-blue-500 rounded transition-all"
                  style={{ width: `${(timeLeft / TEST_DURATION) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="relative w-full aspect-square border border-gray-300">
          {/* Grid lines */}
          {Array.from({ length: GRID_SIZE - 1 }).map((_, i) => (
            <React.Fragment key={i}>
              <div 
                className="absolute bg-gray-200" 
                style={{
                  left: `${((i + 1) / GRID_SIZE) * 100}%`,
                  top: 0,
                  width: '1px',
                  height: '100%'
                }}
              />
              <div 
                className="absolute bg-gray-200" 
                style={{
                  top: `${((i + 1) / GRID_SIZE) * 100}%`,
                  left: 0,
                  height: '1px',
                  width: '100%'
                }}
              />
            </React.Fragment>
          ))}

          {/* Focal point */}
          {testActive && (
            <div 
              className="absolute w-3 h-3 bg-black rounded-full transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${(focalPoint.x / GRID_SIZE) * 100}%`,
                top: `${(focalPoint.y / GRID_SIZE) * 100}%`
              }}
            />
          )}

          {/* Secondary blinking point */}
          {testActive && showSecondaryDot && (
            <div 
              className="absolute w-3 h-3 bg-blue-500 rounded-full transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${(secondaryPoint.x / GRID_SIZE) * 100}%`,
                top: `${(secondaryPoint.y / GRID_SIZE) * 100}%`
              }}
            />
          )}

          {/* Previously tested points */}
          {testedPoints.map((point, index) => (
            <div 
              key={index}
              className={`absolute w-2 h-2 ${point.seen ? 'bg-green-500' : 'bg-red-500'} rounded-full transform -translate-x-1/2 -translate-y-1/2`}
              style={{
                left: `${(point.x / GRID_SIZE) * 100}%`,
                top: `${(point.y / GRID_SIZE) * 100}%`
              }}
            />
          ))}

        </div>

        {/* Results display */}
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Results:</h3>
          <p>Total points tested: {testedPoints.length}</p>
          <p>Blind spots found: {testedPoints.filter(p => !p.seen).length}</p>
          <p>Visible points: {testedPoints.filter(p => p.seen).length}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default OcularTest;
