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
const STEP_SIZE = 2;
const MAX_RADIUS = 12;
const MIN_RADIUS = 2;

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

// Angle ranges for testing adjacent quadrants
const QUADRANT_ANGLES = {
  1: { start: 3 * Math.PI / 4, end: 5 * Math.PI / 4 },     // Test Q3 when focal in Q1
  2: { start: 5 * Math.PI / 4, end: 7 * Math.PI / 4 },     // Test Q4 when focal in Q2
  3: { start: -Math.PI / 4, end: Math.PI / 4 },            // Test Q1 when focal in Q3
  4: { start: Math.PI / 4, end: 3 * Math.PI / 4 }          // Test Q2 when focal in Q4
};

type GridMap = Map<string, boolean>;

const OcularTest = () => {
  const [testState, setTestState] = useState({
    currentTest: 1,
    testActive: false,
    timeLeft: TEST_DURATION,
    showSecondaryDot: true,
    radius: MAX_RADIUS,
  });

  const [focalPoint, setFocalPoint] = useState<Point>({ x: 4, y: 4, seen: true });
  const [secondaryPoint, setSecondaryPoint] = useState<Point>({ x: 15, y: 15, seen: false });
  const [testedPoints, setTestedPoints] = useState<Point[]>([]);
  const [testedLocations, setTestedLocations] = useState<GridMap>(new Map());

  const isLocationTested = useCallback((x: number, y: number) => {
    return testedLocations.has(`${Math.round(x)},${Math.round(y)}`);
  }, [testedLocations]);

  const markLocationTested = useCallback((point: Point) => {
    setTestedLocations(prev => {
      const newMap = new Map(prev);
      newMap.set(`${Math.round(point.x)},${Math.round(point.y)}`, true);
      return newMap;
    });
  }, []);

  const constrainToGrid = (point: Point): Point => {
    return {
      x: Math.max(0, Math.min(GRID_SIZE - 1, point.x)),
      y: Math.max(0, Math.min(GRID_SIZE - 1, point.y)),
      seen: point.seen
    };
  };

  const isInPrimaryTestQuadrant = useCallback((point: Point) => {
    // Define quadrant boundaries with some margin
    const margin = 2;
    const midX = GRID_SIZE/2;
    const midY = GRID_SIZE/2;
    
    // Testing areas should focus on the quadrant where the initial secondary dot was placed
    switch(testState.currentTest) {
      case 1: // When focal in Q1, test primarily in Q3
        return point.x >= midX - margin && point.y >= midY - margin;
      case 2: // When focal in Q2, test primarily in Q4
        return point.x <= midX + margin && point.y >= midY - margin;
      case 3: // When focal in Q3, test primarily in Q1
        return point.x <= midX + margin && point.y <= midY + margin;
      case 4: // When focal in Q4, test primarily in Q2
        return point.x >= midX - margin && point.y <= midY + margin;
      default:
        return false;
    }
  }, [testState.currentTest]);

  const getNextInwardPoint = useCallback((fromPoint: Point) => {
    // Calculate vector from focal point to current point
    const dx = fromPoint.x - focalPoint.x;
    const dy = fromPoint.y - focalPoint.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Move 2 squares closer to focal point along the same line
    const ratio = (distance - STEP_SIZE) / distance;
    const newX = Math.round(focalPoint.x + dx * ratio);
    const newY = Math.round(focalPoint.y + dy * ratio);
    
    return constrainToGrid({ x: newX, y: newY, seen: false });
  }, [focalPoint]);

  const calculateNextPoint = useCallback(() => {
    // If the last point wasn't seen, move inward along the same line
    const lastPoint = testedPoints[testedPoints.length - 1];
    if (lastPoint && !lastPoint.seen && isInPrimaryTestQuadrant(lastPoint)) {
      console.log('Moving inward from unseen point:', lastPoint);
      const nextPoint = getNextInwardPoint(lastPoint);
      // Only return if the point hasn't been tested yet
      if (!isLocationTested(nextPoint.x, nextPoint.y)) {
        console.log('Next inward point:', nextPoint);
        return nextPoint;
      }
    }

    // If not moving inward, find a new untested point in the primary quadrant
    const angles = QUADRANT_ANGLES[testState.currentTest as keyof typeof QUADRANT_ANGLES];
    console.log('Looking for new point in primary quadrant', {
      currentTest: testState.currentTest,
      angleRange: angles
    });
    
    // Start from the initial secondary position and sweep inward
    const initialPosition = INITIAL_SECONDARY_POSITIONS[testState.currentTest as keyof typeof INITIAL_SECONDARY_POSITIONS];
    const dx = initialPosition.x - focalPoint.x;
    const dy = initialPosition.y - focalPoint.y;
    const maxDistance = Math.sqrt(dx * dx + dy * dy);
    
    // Try points at decreasing distances from the initial position
    for (let distance = maxDistance; distance >= MIN_RADIUS; distance -= STEP_SIZE) {
      // Try multiple angles at each distance
      for (let i = 0; i < 8; i++) {
        const baseAngle = Math.atan2(dy, dx);
        const angleOffset = (i - 4) * Math.PI / 16; // Spread around the base angle
        const angle = baseAngle + angleOffset;
        
        const x = Math.round(focalPoint.x + distance * Math.cos(angle));
        const y = Math.round(focalPoint.y + distance * Math.sin(angle));
        
        const point = constrainToGrid({ x, y, seen: false });
        
        // Check if this point is valid and untested
        if (isInPrimaryTestQuadrant(point) && !isLocationTested(point.x, point.y)) {
          console.log('Found new test point:', point);
          return point;
        }
      }
    }
    
    console.log('No more valid points found, ending test');
    return null;
  }, [testedPoints, testState.currentTest, focalPoint, isInPrimaryTestQuadrant, isLocationTested, getNextInwardPoint]);

  const handleTimeout = useCallback(() => {
    // Mark current point as not seen
    const updatedPoint = { ...secondaryPoint, seen: false };
    setTestedPoints(prev => [...prev, updatedPoint]);
    markLocationTested(updatedPoint);

    const nextPoint = calculateNextPoint();
    if (nextPoint) {
      setSecondaryPoint(nextPoint);
      setTestState(prev => ({ ...prev, timeLeft: TEST_DURATION }));
    } else {
      setTestState(prev => ({ ...prev, testActive: false }));
    }
  }, [secondaryPoint, calculateNextPoint, markLocationTested]);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (event.code === 'Space' && testState.testActive) {
      const updatedPoint = { ...secondaryPoint, seen: true };
      setTestedPoints(prev => [...prev, updatedPoint]);
      markLocationTested(updatedPoint);

      const nextPoint = calculateNextPoint();
      if (nextPoint) {
        setSecondaryPoint(nextPoint);
        setTestState(prev => ({ ...prev, timeLeft: TEST_DURATION }));
      } else {
        setTestState(prev => ({ ...prev, testActive: false }));
      }
    }
  }, [testState.testActive, secondaryPoint, calculateNextPoint, markLocationTested]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Timer effect
  useEffect(() => {
    if (testState.testActive && testState.timeLeft > 0) {
      const timer = setInterval(() => {
        setTestState(prev => ({ ...prev, timeLeft: prev.timeLeft - 100 }));
      }, 100);
      return () => clearInterval(timer);
    } else if (testState.timeLeft <= 0 && testState.testActive) {
      handleTimeout();
    }
  }, [testState.testActive, testState.timeLeft, handleTimeout]);

  // Blink effect
  useEffect(() => {
    if (testState.testActive) {
      const blinkInterval = setInterval(() => {
        setTestState(prev => ({ ...prev, showSecondaryDot: !prev.showSecondaryDot }));
      }, 500);
      return () => clearInterval(blinkInterval);
    }
  }, [testState.testActive]);

  const startTest = (testNumber: number) => {
    const newFocalPoint = constrainToGrid({ 
      ...FOCAL_POINTS[testNumber as keyof typeof FOCAL_POINTS], 
      seen: true 
    });
    const initialSecondary = constrainToGrid({ 
      ...INITIAL_SECONDARY_POSITIONS[testNumber as keyof typeof INITIAL_SECONDARY_POSITIONS], 
      seen: false 
    });
    
    setTestState({
      currentTest: testNumber,
      testActive: true,
      timeLeft: TEST_DURATION,
      showSecondaryDot: true,
      radius: MAX_RADIUS,
    });
    setFocalPoint(newFocalPoint);
    setSecondaryPoint(initialSecondary);
    setTestedPoints([]);
    setTestedLocations(new Map());
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
                disabled={testState.testActive}
                className="px-4 py-2"
              >
                Start Test {testNum}
              </Button>
            ))}
          </div>
          {testState.testActive && (
            <div className="mb-4">
              <div className="h-2 bg-gray-200 rounded">
                <div 
                  className="h-2 bg-blue-500 rounded transition-all"
                  style={{ width: `${(testState.timeLeft / TEST_DURATION) * 100}%` }}
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
          {testState.testActive && (
            <div 
              className="absolute w-3 h-3 bg-black rounded-full transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${(focalPoint.x / GRID_SIZE) * 100}%`,
                top: `${(focalPoint.y / GRID_SIZE) * 100}%`
              }}
            />
          )}

          {/* Secondary blinking point */}
          {testState.testActive && testState.showSecondaryDot && (
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