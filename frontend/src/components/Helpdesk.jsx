import React from 'react'
import { useState } from 'react';
import { FaBars, FaTimes } from 'react-icons/fa';
import { FaPlay } from 'react-icons/fa'; 
import { AiOutlineComment } from 'react-icons/ai'; 
import Navbar from '../components/Navbar';
import './Helpdesk.css';
function Helpdesk() {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
    const [visible, setVisible] = useState([false, false, false]);

    const paragraphs = [
      "ጨዋታውን ለማስጀመር  መጀመርያ  HOME ፔጅ ላይ መሆን አለብን  አዛ ፔጅ ላይ ከምናገኛቸው በተኖች  ወስጥ  new game የሚለውን መምረጥ አለብን  (እዚህ ጋር start game and resume game አይሰሩልንም ) ምክንያቱም ጨዋታውን ለማስጀመር ካርቴላ መምረጥ አለብን፡፡new game ካልን በኋላ  ወደ ካርቴላ መምረጫው ገፅ ይወስደናል አዚህም የምናገኘው የካርቴላ ገፅ ይባላል ፡፡ከዘህም ገፅ ተጫወቾቹ የመረጡጥትን ካርቴላ ክለክ በማድረግ እንመርጣለን፡፡ ከዛም  start game እንላለንበመቀጠልም ወደ ዋናው ፔጅ ይመልሰናል ያኔ  start game ማለት እንችላለን ካዛም ጨዋታው ይጀመራል፡፡",
      "ካርቴላ መምረጫው ገፅ ላይ  20% የሚለውን መምረጫ ስንጫን  15% 10% ካሉት አማራጮች ውሰጥ የፈለግነውን ፐርሰንት ከጨዋታው የሚቆረጠውን መምረጥ እንችላለን?",
      "ሁለት አይነት  ጨዋታ አለ “one cheak” and “two cheak”  የሚባሉ ሲሆኑ የመጀመርያው  አዘጋግ በ1ኮለምን ወይም በ1 ሮው ወይም በዲያጎናል ሲሆን ፡፡ ሁለተኛው ደግሞ በሁለት ኮለመን ፣በሁለት ሮው፣በሁለት ዲያጎናል ፣በኮርነር መዘጋት አስፈላጊ ይሆናል",
      "አንድ ተቻዋች ቢንጎ ካለ በኋላ  bingo የሚለውን በተን  በመጫን  ቀጥር መጥረያ ይመጣለናል አዛ ውስጥ ቢንጎ ያለውን ሰውዬ  ወጤት ማሸነፍ አለማሸነፍ ያሰውቀናል፡፡ ከዛም ካሸነፈ እና ሌላ ተጫዋች ከሌለ close የሚለውን በተን በመጫን እነወጣለን  ሌላ ቢንጎ ያለ ሰው ካለ other  የሚለውን በትን እነጫን እና ቁጥር እናስገባለን ፡፡ ተሳሳተ ጥሪ ወይም አሸናፊ ከሌለ  back  ብለን በመውጣት ጨዋታውን ማስቀጠል አንችላለን"
    ];
  
    const toggleVisibility = (index) => {
      const updatedVisibility = [...visible];
      updatedVisibility[index] = !updatedVisibility[index];
      setVisible(updatedVisibility);
    };
  
    return (
        <React.Fragment>
    <Navbar />
      <div className="containers">
        <h1 className="title">ስለ ቢንጎ አጨዋወት  ጠቅለል ያለ መረጃ</h1>
        <div className="button-container">
          {['እንዴት ልንጫወት እነቸላለን?', 'ሰለ ፐርሰንት አቆራረጥ?', 'ስንት አይነት ጨዋታ አለ?','አንድ ተጫዋች  ቢነጎ ካለ በኋላ ምን  እናረጋለን?'].map((buttonText, index) => (
            <div key={index}>
              <button className="button" onClick={() => toggleVisibility(index)}>
               <AiOutlineComment style={{ marginRight: '10px' }} /> {buttonText} <span className="icon">+</span>
              </button>
              {visible[index] && <p className="paragraph">{paragraphs[index]}</p>}
            </div>
          ))}
        </div>
      </div>
      </React.Fragment>
      );
}

export default Helpdesk