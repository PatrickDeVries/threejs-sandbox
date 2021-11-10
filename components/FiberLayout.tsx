import React, { useRef } from 'react';
import { Canvas, extend, useFrame, useThree } from '@react-three/fiber';
import styled from 'styled-components';
import { AdditiveBlending, BufferAttribute, BufferGeometry, Points, TextureLoader } from 'three';
import { Button, RangeSlider, Text, Card, Label, TextInput } from '@headstorm/foundry-react-ui';
import Icon from '@mdi/react';
import { mdiChevronDown, mdiChevronUp } from '@mdi/js';
import './particlematerial';

const BgCanvas = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: 100vw;
  background-image: linear-gradient(168deg, #fff, #555);
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
  ${({ visibleControls }: { visibleControls: boolean }) =>
    visibleControls ? 'width: 30vw;' : 'max-width: 30vw;'}
  margin: 1rem;
  background-color: #fff8;
  max-height: 100vh;
  transition: all 5s;
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
  const particles = props.particles;
  const pointRef = useRef<Points>();
  const particleCount = props.particleCount;
  const baseV = props.baseV;
  const vVariance = props.vVar;
  const baseTurnSpeed = props.baseTurnV;
  const turnVariance = props.turnVar;
  const sizes = [];
  for (let i = 0; i < 999999; i++) {
    sizes.push(5);
  }

  if (props.positions.length < particleCount) {
    const positions = [];
    const velocities = [];
    const angles = [];
    for (let i = 0; i < 999999; i++) {
      positions.push(
        Math.random() * viewport.width - viewport.width / 2,
        Math.random() * viewport.height - viewport.height / 2,
        0,
      );
      velocities.push(Math.random(), Math.random(), 0);
      let newA = Math.random() * 2 * Math.PI;
      if (
        newA < 0.01 ||
        newA > Math.PI - 0.01 ||
        (newA < Math.PI / 2 + 0.01 && newA > Math.PI / 2 - 0.01) ||
        (newA < Math.PI / 4 + 0.01 && newA > Math.PI / 4 - 0.01) ||
        (newA < (Math.PI * 3) / 4 + 0.01 && newA > (Math.PI * 3) / 4 - 0.01)
      ) {
        newA += 0.03;
      }
      angles.push(newA);
    }

    props.setPositions(positions);
    props.setVelocities(velocities);
    props.setAngles(angles);
  }

  const pi2 = Math.PI * 2;

  const updatePositions = () => {
    if (particles.current) {
      const pps: BufferAttribute = particles.current['attributes']['position'] as BufferAttribute;
      const pvs: BufferAttribute = particles.current['attributes']['velocity'] as BufferAttribute;
      const pas: BufferAttribute = particles.current['attributes']['angle'] as BufferAttribute;

      for (let i = 0, l = particleCount; i < l; i++) {
        let angle = pas.getX(i);
        let v = pvs.getX(i) * vVariance + baseV;
        let turnV = pvs.getY(i) * turnVariance + baseTurnSpeed;

        //TODO: decide if i want this
        // if (Math.random() > 0.9999) {
        //   pps.setXY(i, 0, 0);
        // } else {
        pps.setXY(i, pps.getX(i) + v * Math.cos(angle), pps.getY(i) + v * Math.sin(angle));
        // }

        if (pps.getX(i) > viewport.width / 2 || pps.getX(i) < -viewport.width / 2) {
          pas.setX(i, Math.atan2(v * Math.sin(angle), -v * Math.cos(angle)));
          // reset if it has somehow escaped
          if (
            pps.getX(i) + v * Math.cos(pas.getX(i)) > viewport.width / 2 ||
            pps.getX(i) + v * Math.cos(pas.getX(i)) < -viewport.width / 2
          ) {
            pps.setXY(i, 0, 0);
          }
        } else if (pps.getY(i) > viewport.height / 2 || pps.getY(i) < -viewport.height / 2) {
          pas.setX(i, Math.atan2(-v * Math.sin(angle), v * Math.cos(angle)));
          // reset if it has somehow escaped
          if (
            pps.getY(i) + v * Math.sin(pas.getX(i)) > viewport.height / 2 ||
            pps.getY(i) + v * Math.sin(pas.getX(i)) < -viewport.height / 2
          ) {
            pps.setXY(i, 0, 0);
          }
        } else if (i % props.freeRate !== 0 && i > 0) {
          let goalAngle = Math.atan2(pps.getY(i - 1) - pps.getY(i), pps.getX(i - 1) - pps.getX(i));
          let newAngle =
            ((goalAngle - angle + Math.PI) % pi2) - Math.PI < turnV
              ? goalAngle
              : goalAngle > (angle + Math.PI) % pi2
              ? angle - turnV
              : angle + turnV;
          // if (newAngle % pi2 < 0.01) {
          //   if (pps.getX(i) > 0) {
          //     newAngle += 0.05;
          //   } else {
          //     newAngle -= 0.05;
          //   }
          // } else if (newAngle % pi2 < Math.PI / 4 + 0.01 && newAngle % pi2 > Math.PI / 4) {
          //   if (pps.getY(i) > 0) {
          //     newAngle += 0.05;
          //   }
          // }
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
          array={new Float32Array(props.positions)}
          itemSize={3}
        />
        <bufferAttribute
          attachObject={['attributes', 'velocity']}
          count={particleCount}
          array={new Float32Array(props.velocities)}
          itemSize={3}
        />
        <bufferAttribute
          attachObject={['attributes', 'angle']}
          count={particleCount}
          array={new Float32Array(props.angles)}
          itemSize={1}
        />
        <bufferAttribute
          attachObject={['attributes', 'size']}
          count={particleCount}
          array={new Float32Array(sizes)}
          itemSize={1}
        />
      </bufferGeometry>
      <particleMaterial />
    </points>
  );
};
// {/* <pointsMaterial
//   attach="material"
//   size={0.1}
//   color={props.color}
//   map={new TextureLoader().load('/particle.png')}
//   blending={AdditiveBlending}
// /> */}

const FiberLayout = () => {
  const [visibleControls, setVibisibleControls] = React.useState<boolean>(true);

  const [particleCount, setParticleCount] = React.useState<number>(5000);
  const [baseV, setBaseV] = React.useState<number>(0.05);
  const [vVar, setVVar] = React.useState<number>(0.003);
  const [baseTurnV, setBaseTurnV] = React.useState<number>(0.03 * Math.PI);
  const [turnVar, setTurnVar] = React.useState<number>(0.003 * Math.PI);
  const [freeRate, setFreeRate] = React.useState<number>(200);
  const [color, setColor] = React.useState<string>('#114455');

  const [positions, setPositions] = React.useState<number[]>([]);
  const [velocities, setVelocities] = React.useState<number[]>([]);
  const [angles, setAngles] = React.useState<number[]>([]);
  const particles = useRef<BufferGeometry>();

  const updateState = () => {
    if (particles.current) {
      setPositions(particles.current.attributes.position.array as number[]);
      setVelocities(particles.current.attributes.velocity.array as number[]);
      setAngles(particles.current.attributes.angle.array as number[]);
    }
  };

  return (
    <BgCanvas id="bgCanvas">
      <Canvas camera={{ position: [0, 0, 5] }}>
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
        <pointLight position={[-10, -10, -10]} />
        <Particles
          particleCount={particleCount}
          baseV={baseV}
          vVar={vVar}
          baseTurnV={baseTurnV}
          turnVar={turnVar}
          freeRate={freeRate}
          positions={positions}
          setPositions={setPositions}
          velocities={velocities}
          setVelocities={setVelocities}
          angles={angles}
          setAngles={setAngles}
          particles={particles}
          color={color}
        />
      </Canvas>
      <Overlay>
        <Card
          header={
            <Button
              color="#fff2"
              onClick={() => {
                updateState();
                setVibisibleControls(!visibleControls);
              }}
            >
              <span>
                <Text>Controls</Text>
                <Icon size="1rem" path={visibleControls ? mdiChevronDown : mdiChevronUp}></Icon>
              </span>
            </Button>
          }
          StyledContainer={ControlCard}
          containerProps={{ visibleControls }}
        >
          {visibleControls && (
            <>
              <Label labelText="Particle count" color="black">
                <RangeSlider
                  min={1}
                  max={99999}
                  values={[{ value: particleCount, label: particleCount }]}
                  showDomainLabels
                  showHandleLabels
                  onDrag={(newVal: number) => {
                    updateState();
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
                    updateState();
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
                    updateState();
                    setVVar(newVal);
                  }}
                />
              </Label>
              <Label labelText="Base Turn Speed" color="black">
                <RangeSlider
                  min={0}
                  max={parseFloat((Math.PI / 4).toFixed(4))}
                  values={[{ value: baseTurnV, label: parseFloat(baseTurnV.toFixed(4)) }]}
                  showDomainLabels
                  showHandleLabels
                  onDrag={(newVal: number) => {
                    updateState();
                    setBaseTurnV(newVal);
                  }}
                />
              </Label>
              <Label labelText="Turn Speed Variance" color="black">
                <RangeSlider
                  min={0}
                  max={parseFloat((Math.PI / 4).toFixed(4))}
                  values={[{ value: turnVar, label: parseFloat(turnVar.toFixed(4)) }]}
                  showDomainLabels
                  showHandleLabels
                  onDrag={(newVal: number) => {
                    updateState();
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
                    updateState();
                    setFreeRate(Math.round(newVal));
                  }}
                />
              </Label>
              <Label labelText="Color" color="black">
                <TextInput
                  maxLength={7}
                  value={color}
                  onChange={event => setColor(event.target.value)}
                />
              </Label>
              <Button
                color="#fff7"
                onClick={() => {
                  setPositions([]);
                  setVelocities([]);
                  setAngles([]);
                }}
              >
                Reset Particles
              </Button>
            </>
          )}
        </Card>
      </Overlay>
    </BgCanvas>
  );
};

export default FiberLayout;
