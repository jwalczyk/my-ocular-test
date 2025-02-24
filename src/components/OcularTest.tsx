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
const TEST_DURATION = 5000; // Changed to 5 seconds as per requirement
const STEP_SIZE = 1;
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

type GridMap = Map<string, boolean>;

const OcularTest = () => {
  const [testState, setTestState] = useState({
    currentTest: 1,
    testActive: false,
    timeLeft: TEST_DURATION,
    showSecondaryDot: true,
    radius: MAX_RADIUS,
    currentSweepAngle: 0,
    currentTestRadius: MAX_RADIUS
  });

  const [focalPoint, setFocalPoint] = useState<Point>({ x: 4, y: 4, seen: true });
  const [secondaryPoint, setSecondaryPoint] = useState<Point>({ x: 15, y: 15, seen: false });
  const [testedPoints, setTestedPoints] = useState<Point[]>([]);
  const [testedLocations, setTestedLocations] = useState<GridMap>(new Map());
  
  // Store boundary points - key is angle (in radians), value is distance
  const [boundaryPoints, setBoundaryPoints] = useState<Map<number, number>>(new Map());

  // Even more precise point key to ensure we never test the same location twice
  const getPointKey = (x: number, y: number) => {
    // Use two decimal places for better precision
    return `${Math.round(x * 100) / 100},${Math.round(y * 100) / 100}`;
  };

  const isLocationTested = useCallback((x: number, y: number) => {
    return testedLocations.has(getPointKey(x, y));
  }, [testedLocations]);

  const markLocationTested = useCallback((point: Point) => {
    setTestedLocations(prev => {
      const newMap = new Map(prev);
      newMap.set(getPointKey(point.x, point.y), true);
      return newMap;
    });
    
    // Removed numbered indicator for testing sequence
  }, [testedPoints.length]);

  const constrainToGrid = (point: Point): Point => {
    return {
      x: Math.max(0, Math.min(GRID_SIZE - 1, point.x)),
      y: Math.max(0, Math.min(GRID_SIZE - 1, point.y)),
      seen: point.seen
    };
  };

  const isInPrimaryTestQuadrant = useCallback((point: Point) => {
    // Define quadrant boundaries
    const midX = GRID_SIZE / 2;
    const midY = GRID_SIZE / 2;
    
    switch(testState.currentTest) {
      case 1: // When focal in Q1, test primarily in Q3
        return point.x >= midX && point.y >= midY;
      case 2: // When focal in Q2, test primarily in Q4
        return point.x < midX && point.y >= midY;
      case 3: // When focal in Q3, test primarily in Q1
        return point.x < midX && point.y < midY;
      case 4: // When focal in Q4, test primarily in Q2
        return point.x >= midX && point.y < midY;
      default:
        return false;
    }
  }, [testState.currentTest]);

  // Calculate angle from focal point to a point
  const getAngle = (point: Point): number => {
    return Math.atan2(point.y - focalPoint.y, point.x - focalPoint.x);
  };

  // Calculate distance from focal point to a point
  const getDistance = (point: Point): number => {
    const dx = point.x - focalPoint.x;
    const dy = point.y - focalPoint.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Check if a point is beyond the current boundary
  const isBeyondBoundary = useCallback((point: Point): boolean => {
    const angle = getAngle(point);
    const distance = getDistance(point);
    
    // Discretize angle to match our boundary storage (round to nearest 0.01 radians for more precision)
    const roundedAngle = Math.round(angle * 100) / 100;
    
    // Find the nearest angles in our boundary
    let found = false;
    let minDistance = Number.MAX_VALUE;
    
    // Check if there's a boundary point at this angle or nearby
    boundaryPoints.forEach((boundaryDistance, boundaryAngle) => {
      const angleDiff = Math.abs(boundaryAngle - roundedAngle);
      if (angleDiff < 0.15) { // Within about 8-9 degrees for more precision
        found = true;
        minDistance = Math.min(minDistance, boundaryDistance);
      }
    });
    
    // If we have a boundary point in this direction,
    // only test points further out than the boundary
    return !found || distance > minDistance;
  }, [boundaryPoints, focalPoint]);

  // Add a point to the boundary if it's seen
  const updateBoundary = useCallback((point: Point) => {
    if (point.seen) {
      const angle = getAngle(point);
      const distance = getDistance(point);
      const roundedAngle = Math.round(angle * 100) / 100;
      
      setBoundaryPoints(prev => {
        const newBoundary = new Map(prev);
        
        // Only update if we don't have a boundary point at this angle yet
        // or if this point is farther from the focal point
        if (!newBoundary.has(roundedAngle) || distance > newBoundary.get(roundedAngle)!) {
          newBoundary.set(roundedAngle, distance);
        }
        
        return newBoundary;
      });
    }
  }, [focalPoint]);

  const calculateNextPoint = useCallback(() => {
    const baseAngle = Math.PI * (testState.currentTest - 1) / 2; // Base direction based on test
    
    // Strategy: Sweep radially with increasing angles
    let radius = testState.currentTestRadius;
    let angle = testState.currentSweepAngle;
    
    // Try up to 360 different angle positions with more granularity
    for (let i = 0; i < 360; i++) {
      const testAngle = baseAngle + angle;
      const newX = Math.round(focalPoint.x + radius * Math.cos(testAngle));
      const newY = Math.round(focalPoint.y + radius * Math.sin(testAngle));
      const newPoint = constrainToGrid({ x: newX, y: newY, seen: false });
      
      if (isInPrimaryTestQuadrant(newPoint) && 
          !isLocationTested(newPoint.x, newPoint.y) && 
          isBeyondBoundary(newPoint)) {
            
        // Update the sweep angle for next time
        setTestState(prev => ({
          ...prev,
          currentSweepAngle: (angle + 0.2) % (2 * Math.PI) // Increment by about 11 degrees
        }));
        
        return newPoint;
      }
      
      // Try the next angle
      angle = (angle + 0.01) % (2 * Math.PI); // More granular angle increments
    }
    
    // If we couldn't find a point at this radius, try reducing the radius
    if (radius > MIN_RADIUS) {
      setTestState(prev => ({
        ...prev,
        currentTestRadius: prev.currentTestRadius - STEP_SIZE,
        currentSweepAngle: 0 // Reset angle when changing radius
      }));
      
      // Try again with a smaller radius
      radius -= STEP_SIZE;
      angle = 0;
      
      for (let i = 0; i < 360; i++) {
        const testAngle = baseAngle + angle;
        const newX = Math.round(focalPoint.x + radius * Math.cos(testAngle));
        const newY = Math.round(focalPoint.y + radius * Math.sin(testAngle));
        const newPoint = constrainToGrid({ x: newX, y: newY, seen: false });
        
        if (isInPrimaryTestQuadrant(newPoint) && 
            !isLocationTested(newPoint.x, newPoint.y) && 
            isBeyondBoundary(newPoint)) {
              
          // Update the sweep angle for next time
          setTestState(prev => ({
            ...prev,
            currentSweepAngle: (angle + 0.2) % (2 * Math.PI)
          }));
          
          return newPoint;
        }
        
        // Try the next angle
        angle = (angle + 0.01) % (2 * Math.PI); // More granular angle increments
      }
    }
    
    // If we still couldn't find a point, try expanding the radius to find gaps
    if (testedPoints.length > 0) {
      for (let expandedRadius = MAX_RADIUS; expandedRadius > MIN_RADIUS; expandedRadius -= STEP_SIZE) {
        for (let i = 0; i < 360; i++) {
          const testAngle = i * Math.PI / 180; // Full 360-degree sweep with 1-degree precision
          const newX = Math.round(focalPoint.x + expandedRadius * Math.cos(testAngle));
          const newY = Math.round(focalPoint.y + expandedRadius * Math.sin(testAngle));
          const newPoint = constrainToGrid({ x: newX, y: newY, seen: false });
          
          if (isInPrimaryTestQuadrant(newPoint) && 
              !isLocationTested(newPoint.x, newPoint.y) && 
              isBeyondBoundary(newPoint)) {
            return newPoint;
          }
        }
      }
    }
    
    // No more points to test
    return null;
  }, [
    testState.currentTest, 
    testState.currentSweepAngle, 
    testState.currentTestRadius, 
    focalPoint, 
    isInPrimaryTestQuadrant, 
    isLocationTested, 
    isBeyondBoundary,
    testedPoints.length
  ]);

  const handleTimeout = useCallback(() => {
    // Mark current point as not seen
    const updatedPoint = { ...secondaryPoint, seen: false };
    setTestedPoints(prev => [...prev, updatedPoint]);
    markLocationTested(updatedPoint);
    updateBoundary(updatedPoint);

    const nextPoint = calculateNextPoint();
    if (nextPoint) {
      setSecondaryPoint(nextPoint);
      setTestState(prev => ({ ...prev, timeLeft: TEST_DURATION }));
    } else {
      setTestState(prev => ({ ...prev, testActive: false }));
    }
  }, [secondaryPoint, calculateNextPoint, markLocationTested, updateBoundary]);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (event.code === 'Space' && testState.testActive) {
      const updatedPoint = { ...secondaryPoint, seen: true };
      setTestedPoints(prev => [...prev, updatedPoint]);
      markLocationTested(updatedPoint);
      updateBoundary(updatedPoint);

      const nextPoint = calculateNextPoint();
      if (nextPoint) {
        setSecondaryPoint(nextPoint);
        setTestState(prev => ({ ...prev, timeLeft: TEST_DURATION }));
      } else {
        setTestState(prev => ({ ...prev, testActive: false }));
      }
    }
  }, [testState.testActive, secondaryPoint, calculateNextPoint, markLocationTested, updateBoundary]);

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
      currentSweepAngle: 0,
      currentTestRadius: MAX_RADIUS
    });
    setFocalPoint(newFocalPoint);
    setSecondaryPoint(initialSecondary);
    setTestedPoints([]);
    setTestedLocations(new Map());
    setBoundaryPoints(new Map());
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
              <p className="text-sm mt-1">Press SPACE when you see the blue dot</p>
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
            >

            </div>
          ))}
        </div>

        {/* Results display */}
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Results:</h3>
          <p>Total points tested: {testedPoints.length}</p>
          <p>Blind spots found: {testedPoints.filter(p => !p.seen).length}</p>
          <p>Visible points: {testedPoints.filter(p => p.seen).length}</p>
          <p className="mt-2 text-xs text-gray-500">
            Stare at the black dot and press SPACE when you see the blue dot.
            If you don&apos;t see the blue dot within 5 seconds, it will move to a new location.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default OcularTest;