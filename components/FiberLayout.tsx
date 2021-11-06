import React, { useRef } from 'react';
import { Canvas, render, useFrame, useThree } from '@react-three/fiber';
import styled from 'styled-components';
import { AdditiveBlending, BufferAttribute, BufferGeometry, Points, TextureLoader } from 'three';
import * as THREE from 'three';
import HeatMap from 'heatmap-ts';
import { Button, RangeSlider, Text, Card, Label } from '@headstorm/foundry-react-ui';

const BgCanvas = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 100vw;
  background-image: linear-gradient(168deg, #ffffff, #999);
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 100vw;
  z-index: 5;
`;

const ControlCard = styled(Card.Container)`
  width: 30vw;
  margin: 1rem;
  background-color: #fff5;
`;

const visibleHeightAtZDepth = (depth, camera) => {
  // compensate for cameras not positioned at z=0
  const cameraOffset = camera.position.z;
  if (depth < cameraOffset) depth -= cameraOffset;
  else depth += cameraOffset;

  // vertical fov in radians
  const vFOV = (camera.fov * Math.PI) / 180;

  // Math.abs to ensure the result is always positive
  return 2 * Math.tan(vFOV / 2) * Math.abs(depth);
};

const visibleWidthAtZDepth = (depth, camera) => {
  const height = visibleHeightAtZDepth(depth, camera);
  return height * camera.aspect;
};

const Particles = props => {
  const viewport = useThree(state => state.viewport);
  // const camera = useThree(state => state.camera);

  // var heatMap = [];
  // for (let i = 0; i < viewport.height; i++) {
  //   for (let j = 0; j < viewport.width; j++) {
  //     heatMap.push({ x: j * 100, y: i * 100, value: 0, radius: 30 });
  //   }
  // }
  // console.table(heatMap);
  // const renderMap = new HeatMap({
  //   container: document.getElementById('bgCanvas'),
  //   maxOpacity: 0.6,
  //   radius: 1,
  //   blur: 0.9,
  // });
  const particles = useRef<BufferGeometry>();
  const pointRef = useRef<Points>();
  const particleCount = props.particleCount;
  const baseV = props.baseV;
  const vVariance = props.vVar;
  const baseTurnSpeed = props.baseTurnV;
  const turnVariance = props.turnVar;
  const positions = [];
  const velocities = [];
  const angles = [];
  for (let i = 0; i < 999999; i++) {
    positions.push(
      Math.random() * viewport.width - viewport.width / 2,
      Math.random() * viewport.height - viewport.height / 2,
      0,
    );
    velocities.push(Math.random() * vVariance, Math.random() * turnVariance, 0);
    angles.push(Math.random() * 2 * Math.PI);
  }

  const pi2 = Math.PI * 2;

  // const isOccupied = (i: number, j: number, pps: BufferAttribute) => {
  //   for (let k = 0; k < particleCount; k++) {
  //     let position = new THREE.Vector3(pps.getX(k), pps.getY(k), pps.getZ(k));
  //     position.project(camera);
  //     let pixelX = Math.round((position.x * viewport.width) / 2 + viewport.width / 2);
  //     let pixelY = Math.round(-(position.y * viewport.height) / 2 + viewport.height / 2);

  //     if (pixelX === j && pixelY === i) {
  //       return true;
  //     }
  //   }
  //   return false;
  // };

  // let count = 0;

  // const updateHeatMap = () => {
  //   const pps: BufferAttribute = particles.current['attributes']['position'] as BufferAttribute;

  //   if (count === 0) {
  //     console.log(heatMap);
  //     console.table(heatMap);
  //     count += 1;
  //   }
  //   heatMap.forEach((cell, i) => {
  //     if (isOccupied(cell.y / 10, cell.x / 10, pps)) {
  //       heatMap[i].value += 1;
  //     } else if (heatMap[i].value > 0) {
  //       heatMap[i].value -= 1;
  //     }
  //   });

  //   renderMap.setData({ max: 100, min: 0, data: heatMap });
  // };

  const updatePositions = () => {
    if (particles.current) {
      const pps: BufferAttribute = particles.current['attributes']['position'] as BufferAttribute;
      const pvs: BufferAttribute = particles.current['attributes']['velocity'] as BufferAttribute;
      const pas: BufferAttribute = particles.current['attributes']['angle'] as BufferAttribute;

      for (let i = 0, l = particleCount; i < l; i++) {
        let angle = pas.getX(i);
        let v = pvs.getX(i) + baseV;
        let turnV = pvs.getY(i) + baseTurnSpeed;

        pps.setXY(i, pps.getX(i) + v * Math.cos(angle), pps.getY(i) + v * Math.sin(angle));

        if (pps.getX(i) > viewport.width / 2 || pps.getX(i) < -viewport.width / 2) {
          pas.setX(i, Math.atan2(v * Math.sin(angle), -v * Math.cos(angle)));
        } else if (pps.getY(i) > viewport.height / 2 || pps.getY(i) < -viewport.height / 2) {
          pas.setX(i, Math.atan2(-v * Math.sin(angle), v * Math.cos(angle)));
        } else if (i % props.freeRate !== 0 && i > 0) {
          let goalAngle = Math.atan2(pps.getY(i - 1) - pps.getY(i), pps.getX(i - 1) - pps.getX(i));
          let newAngle =
            ((goalAngle - angle + Math.PI) % pi2) - Math.PI < turnV
              ? goalAngle
              : goalAngle > (angle + Math.PI) % pi2
              ? angle - turnV
              : angle + turnV;
          pas.setX(i, newAngle % pi2);
        }
      }
    }
  };

  useFrame(() => {
    updatePositions();
    particles.current['attributes']['position'].needsUpdate = true;
    // updateHeatMap();
  });

  // const particleTexture = useLoader(TextureLoader, 'particle.png');

  return (
    <points ref={pointRef}>
      <bufferGeometry ref={particles} attach="geometry">
        <bufferAttribute
          attachObject={['attributes', 'position']}
          count={particleCount}
          array={new Float32Array(positions)}
          itemSize={3}
        />
        <bufferAttribute
          attachObject={['attributes', 'velocity']}
          count={particleCount}
          array={new Float32Array(velocities)}
          itemSize={3}
        />
        <bufferAttribute
          attachObject={['attributes', 'angle']}
          count={particleCount}
          array={new Float32Array(angles)}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        attach="material"
        size={0.1}
        color="#0000ff"
        map={new TextureLoader().load('/particle.png')}
        blending={AdditiveBlending}
      />
    </points>
  );
};

const FiberLayout = () => {
  const [particleCount, setParticleCount] = React.useState<number>(5000);
  const [baseV, setBaseV] = React.useState<number>(0.05);
  const [vVar, setVVar] = React.useState<number>(0.003);
  const [baseTurnV, setBaseTurnV] = React.useState<number>(0.02 * Math.PI);
  const [turnVar, setTurnVar] = React.useState<number>(0.002 * Math.PI);
  const [freeRate, setFreeRate] = React.useState<number>(200);

  return (
    <BgCanvas id="bgCanvas">
      <Canvas camera={{ position: [0, 0, 5] }}>
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
        <pointLight position={[-10, -10, -10]} />
        <bufferGeometry />
        <pointsMaterial />
        <Particles
          particleCount={particleCount}
          baseV={baseV}
          vVar={vVar}
          baseTurnV={baseTurnV}
          turnVar={turnVar}
          freeRate={freeRate}
        />
      </Canvas>
      <Overlay>
        <Card header={<Text>Controls</Text>} StyledContainer={ControlCard}>
          <Label labelText="Particle count" color="black">
            <RangeSlider
              min={1}
              max={99999}
              values={[{ value: particleCount, label: particleCount }]}
              showDomainLabels
              showHandleLabels
              onDrag={(newVal: number) => {
                setParticleCount(Math.round(newVal));
              }}
            />
          </Label>
          <Label labelText="Base Velocity" color="black">
            <RangeSlider
              min={0}
              max={1}
              values={[{ value: baseV, label: parseFloat(baseV.toFixed(4)) }]}
              showDomainLabels
              showHandleLabels
              onDrag={(newVal: number) => {
                setBaseV(newVal);
              }}
            />
          </Label>
          <Label labelText="Velocity Variance" color="black">
            <RangeSlider
              min={0}
              max={1}
              values={[{ value: vVar, label: parseFloat(vVar.toFixed(4)) }]}
              showDomainLabels
              showHandleLabels
              onDrag={(newVal: number) => {
                setVVar(newVal);
              }}
            />
          </Label>
          <Label labelText="Base Turn Speed" color="black">
            <RangeSlider
              min={0}
              max={Math.PI / 4}
              values={[{ value: baseTurnV, label: parseFloat(baseTurnV.toFixed(4)) }]}
              showDomainLabels
              showHandleLabels
              onDrag={(newVal: number) => {
                setBaseTurnV(newVal);
              }}
            />
          </Label>
          <Label labelText="Turn Speed Variance" color="black">
            <RangeSlider
              min={0}
              max={Math.PI / 4}
              values={[{ value: turnVar, label: parseFloat(turnVar.toFixed(4)) }]}
              showDomainLabels
              showHandleLabels
              onDrag={(newVal: number) => {
                setTurnVar(newVal);
              }}
            />
          </Label>
          <Label labelText="Free Thinker Rate (1 per x)" color="black">
            <RangeSlider
              min={0}
              max={particleCount}
              values={[{ value: freeRate, label: freeRate }]}
              showDomainLabels
              showHandleLabels
              onDrag={(newVal: number) => {
                setFreeRate(Math.round(newVal));
              }}
            />
          </Label>
        </Card>
      </Overlay>
    </BgCanvas>
  );
};

export default FiberLayout;
