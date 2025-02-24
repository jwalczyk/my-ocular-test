This repo is for a webpage for a modified version of a simple [confrontation visual field test](https://en.wikipedia.org/wiki/Confrontation_visual_field_testing). The intent is to track patients who recently underwent radiation 
therapy via [Ocular Brachytherapy](https://www.mskcc.org/cancer-care/patient-education/about-ocular-brachytherapy) for Ocular Melonoma and may be 
going blind over time as the radiation progresses it while other therapies such as TTT, Avastin, etc. attempt to prevent. 

However, the test can also be used to help screen for peripheral vision loss and can indicate potential issues with the visual pathways in the 
brain or the retina.

Each test will start out with a primary focal point dot (black dot) that the patient should stare at while a secondary blinking dot appears that the user
should try to see out of their peripheral vision.  If the blinking secondary dot happens to be in the patient’s blind spot, the webpage will track this 
and mark that location on the grid with a red dot. Ultimately, the goal of a given test is to map out all points (red dots) that the patient cannot see.
Each of the four tests are basically the same method except the location of the focal point will move to one of four grid quadrants.

During each Test, the user indicates if they can see the blinking dots by pressing the space bar. They have 5 seconds to do so, and if they cannot see 
the secondary blinking dot before time expires, we mark that grid location with a red dot and move one square towards the primary dot (making it easier 
to see) and repeat the test. When the user eventually presses the space bar; we mark this location as green dot. The goal is to plot out the area our user 
cannot see.  Some tests the user will be able to see everything as the blind spot will fall off the grid and not be measurable – hence the 
reason to move the focal point in the other tests.  For the tests when the user can not see some of the blinking dots, when these tests are done we 
expect the grid to have a large red semi-circle off to one side or perhaps a quarter of a circle made of all red dots in one of the corners.  

See the picture, and notice the numbers on some of the dots to give you an idea of the sequence these were displayed to the patient.

[<img src="image/demo.png">]

## Getting Started

First, run the development server:

```bash
npm install

npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
